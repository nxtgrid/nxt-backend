import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { sleep } from '@helpers/utilities';
import { mapAsyncSequential } from '@helpers/promise-helpers';

import { SupabaseService } from '@core/modules/supabase.module';
import { MakeService } from '@core/modules/make/make.service';

import { PdDocumentTypeEnum } from '@core/types/supabase-types';

interface CreateFolder {
  name: string;
  path: string;
}

interface CreateFileFromTemplate {
  title: string;
  path: string;
  template_id: string;
  type: PdDocumentTypeEnum,
  folder_id: string;
  parameters: any;
}

@Injectable()
export class PdHeroService implements OnApplicationShutdown, OnModuleInit {

  isShuttingDown = false;
  currentlyRunningTasks: any[] = [];

  constructor(
    private readonly makeService: MakeService,
    private readonly supabaseService: SupabaseService,
  ) {}

  onModuleInit() {
    // this.run();
  }

  async onApplicationShutdown(signal?: string) {
    console.info(`Received ${ signal } for shutdown in pd hero service of loch`);
    // This tells pd hero service "stop, do not accept
    // any new messages, just complete the ones you
    // are processing already"
    this.isShuttingDown = true;

    // First we check, so that, we do not wait 5 second for nothing
    // in case there are no pending tasks
    if(this.currentlyRunningTasks.length < 1) return;

    // We wait for 10 iterations, then we accept shut down
    for(let i = 0; i < 10; i++) {
      await sleep(1000 * 5);
      // If there are no more processing tasks, then
      // accept exit.
      if(this.currentlyRunningTasks.length < 1) break;
    }
  }

  public async run() {
    if(process.env.NXT_ENV !== 'production') return;

    if(this.isShuttingDown) return;

    const supabase = this.supabaseService.adminClient;

    let nextActionId;
    do {
      // We fetch all the actions that are initialised
      // TODO: figure out how to work through dependencies.
      const { data: nextActionDataId, error: lockError } = await supabase.rpc('lock_next_pd_action');

      if(lockError) throw new Error('An error occurred when trying to lock the upcoming pd_actions');

      nextActionId = nextActionDataId;

      if(!nextActionId) {
        console.info('No more pd actions to process. Closing...');
        return;
      }

      this.currentlyRunningTasks.push(nextActionId);

      try {
        await this.process(nextActionId);
      }
      catch(error) {
        console.error(error);
        await supabase
          .from('pd_actions')
          .update({ pd_action_status: 'GENERATION_FAILED' })
          .eq('id', nextActionId);
      }
      finally {
        // We want to make sure the element is removed either way
        // from the array, otherwise the server will never shutdown
        // when a SIGTERM is received
        this.currentlyRunningTasks = this.currentlyRunningTasks.filter(id => id !== nextActionId);
      }
    } while(nextActionId);
  }

  private async shareGoogleDriveFile(documentId: string, emails: string[]) {
    return mapAsyncSequential(email => {
      return this.makeService.schedule('POST', `/${ process.env.MAKE_SHARE_FILE_FLOW_ID }`, {
        document_id: documentId,
        email: email,
      });
    })(emails);
  }

  private async createGoogleDriveFileFromTemplate(createFileFromTemplate: CreateFileFromTemplate) {
    const requests = Object
      .entries(createFileFromTemplate.parameters)
      .map(([ key, value ]) => ({
        'replaceAllText': {
          'containsText': {
            'text': key,
            'matchCase': true,
          },
          'replaceText': value,
        },
      }));

    const { data } = await this.makeService.schedule('POST', `/${ process.env.MAKE_TEMPLATE_FLOW_ID }`, {
      title: createFileFromTemplate.title,
      folder_id: createFileFromTemplate.folder_id,
      type: createFileFromTemplate.type,
      template_id: createFileFromTemplate.template_id,
      params: {
        'requests': requests,
      },
    });

    let documentId = null;
    if(data) documentId = data.document_id;

    return documentId;
  }

  private async createGoogleDriveFolder(createFolderInput: CreateFolder) {
    const { data } = await this.makeService.schedule('POST', `/${ process.env.MAKE_CREATE_FOLDER_FLOW_ID }`, {
      path: createFolderInput.path,
      name: createFolderInput.name,
    });

    let folderId = null;
    if(data) folderId = data.folder_id;

    if(!folderId) throw new Error(`Folder for path ${ createFolderInput.path } and ${ createFolderInput.name }`);

    return folderId;
  }

  private async process(actionId: number) {
    const { handleResponse, adminClient: supabase } = this.supabaseService;

    const action = await supabase
      .from('pd_actions')
      .select(`
        *,
        pd_flow:pd_flows(*),
        pd_action_template:pd_action_templates(
          *,
          pd_document_template:pd_document_templates(*)
        )
      `)
      .eq('id', actionId)
      .single()
      .then(handleResponse);

    let flow = action.pd_flow;
    const [ site ] = await supabase
      .from('pd_sites')
      .select('*, organization:organizations(id, name, pd_hero_google_drive_folder_id)')
      .eq('pd_flow_id', flow.id)
      .order('id', { ascending: false })
      .limit(1) //TODO: could there be more flows for the same site?
      .then(handleResponse);

    if(!site) throw new Error(`Could not find site for flow ${ flow.id }`);

    // If the pd_hero_google_drive_folder_id is already populated, it means that
    // this organization already has a folder that's going to contain all the
    // folders for every future pd hero project. Otherwise, we need to
    // generate the folder and update the pd_hero_google_drive_folder_id in organizations table

    let organizationPdHeroFolderId: string = site.organization.pd_hero_google_drive_folder_id;
    if(!organizationPdHeroFolderId) {
      organizationPdHeroFolderId = await this.createGoogleDriveFolder({
        name: site.organization.name,
        path: process.env.MAKE_PD_HERO_FOLDER_PATH, // the folder is added to the base folder in google drive
      });

      if(!organizationPdHeroFolderId) throw new Error(`Make could not create a pd hero folder for pd flow with id ${ flow.id }`);

      await supabase
        .from('organizations')
        .update({ pd_hero_google_drive_folder_id: organizationPdHeroFolderId })
        .eq('id', site.organization.id)
        .then(handleResponse);
    }

    // Now we can create the project folder, where all the documents about this project
    // will be contained
    let projectFolderId: string = flow.google_folder_id;
    if(!projectFolderId) {
      projectFolderId = await this.createGoogleDriveFolder({
        name: action.name,
        path: organizationPdHeroFolderId, //the project folder is added to the organization folder
      });

      if(!projectFolderId) throw new Error(`Make could not create a project folder for pd flow with id ${ flow.id }`);

      flow = await supabase
        .from('pd_flows')
        .update({ google_folder_id: projectFolderId })
        .eq('id', flow.id )
        .select('*')
        .single()
        .then(handleResponse);
    }

    // TODO: uncomment
    // Fetch all the members of the current organization that are admins
    // const members = await supabase
    //   .from('members')
    //   .select('*, accounts!inner(id, email, organization_id)')
    //   .eq('accounts.organization_id', author.organization_id)
    //   .in('member_type', [ MemberType.ADMIN, MemberType.DEVELOPER, MemberType.SUPERADMIN ])
    //   .then(handleResponse);

    // const developerEmailsToShareFileWith = members
    //   .map(member => member.accounts.email);
    // const developerEmailsToShareFileWith = [ 'tommaso.girotto91@gmail.com' ];

    if(action.pd_action_type === 'TEMPLATE') {
      const actionTemplate = action.pd_action_template;

      if(!actionTemplate) throw new Error(`Action ${ action.id } does not have a template`);

      const pdDocument = actionTemplate.pd_document_template;
      if(!pdDocument) throw new Error(`Action ${ action.id } with action template ${ actionTemplate.id } does not have a document pointer`);

      const createdFileId = await this.createGoogleDriveFileFromTemplate({
        title: actionTemplate.name,
        folder_id: flow.google_folder_id,
        template_id: pdDocument.google_drive_template_id,
        type: pdDocument.pd_document_type,
        path: '',
        parameters: this.injectParams(action, {}),
      });
      if(!createdFileId) throw new Error(`Make failed to create file for action ${ action.id }`);

      // In order to maintain versioning, we need to add a new document to the
      // pd_documents table
      const insertedDocument = await supabase
        .from('pd_documents')
        .insert([
          {
            pd_action_id: action.id,
            google_drive_document_id: createdFileId,
          },
        ])
        .eq('id', action.id )
        .select('*')
        .single()
        .then(handleResponse);

      await supabase
        .from('pd_actions')
        .update({ pd_action_status: 'GENERATION_COMPLETED', latest_pd_document_id: insertedDocument.id })
        .eq('id', action.id );
      // For every file created, we share it with the members of the
      // developer organization that have admin access
      // TODO: uncomment and rediscuss
      // await this.shareFile(createdFile, developerEmailsToShareFileWith);
    }


    // Once all the actions and the folders have been created, then
    // we can return all the actions that have just been created.
    // TODO: what about acl?
    return { id: flow.id };
  }

  // Given an organization and a document, this function returns the params that are going
  // to be required to be injected
  injectParams(action, paramMap) {
    const params = {};

    // TODO: waiting for further discussion
    console.info('PARAM MAP', paramMap);

    action.params = params;
    return action;
  }
}
