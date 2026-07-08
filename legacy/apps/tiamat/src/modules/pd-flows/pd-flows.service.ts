import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { mapAsyncSequential } from '@helpers/promise-helpers';
import { CreatePdFlowDto } from './dto/create-pd-flow.dto';
import { NxtSupabaseUser } from '../auth/nxt-supabase-user';
import { InsertPdAction } from '@core/types/supabase-types';

const {
  MAKE_API_URL,
  MAKE_SHARE_FILE_FLOW_ID,
  MAKE_TEMPLATE_FLOW_ID,
  MAKE_CREATE_FOLDER_FLOW_ID,
} = process.env;

interface CreateFolder {
  name: string;
  path: string;
}

interface CreateFileFromTemplate {
  title: string;
  path: string;
  template_id: string;
  folder_id: string;
  parameters: any;
}

@Injectable()
export class PdFlowsService {
  constructor(private readonly httpService: HttpService) { }

  private async shareFile(documentId: string, emails: string[]) {
    return mapAsyncSequential(email => this.httpService
      .axiosRef
      .post(`${ MAKE_API_URL }/${ MAKE_SHARE_FILE_FLOW_ID }`, {
        document_id: documentId,
        email: email,
      }))(emails)
    ;
  }

  private async createFileFromTemplate(createFileFromTemplate: CreateFileFromTemplate) {
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

    const { data } = await this.httpService
      .axiosRef
      .post(`${ MAKE_API_URL }/${ MAKE_TEMPLATE_FLOW_ID }`, {
        title: createFileFromTemplate.title,
        folder_id: createFileFromTemplate.folder_id,
        template_id: createFileFromTemplate.template_id,
        params: {
          'requests': requests,
        },
      });

    let documentId = null;
    if(data) documentId = data.document_id;

    return documentId;
  }

  private createFolder({ path, name }: CreateFolder) {
    return this.httpService.axiosRef
      .post(`${ MAKE_API_URL }/${ MAKE_CREATE_FOLDER_FLOW_ID }`, { path, name })
      .then(({ data }) => data)
      .then(({ folder_id }) => folder_id)
      .catch(err => {
        const message = `[PD FLOWS] Error creating folder for path ${ path } and ${ name }`;
        console.error(message, err.message, err.status);
        throw new InternalServerErrorException(message);
      })
    ;
  }

  async create(createFlowInput: CreatePdFlowDto, author: NxtSupabaseUser) {
    const { handleResponse, client: supabase } = author.supabase;
    const pdFlowTemplate = await supabase
      .from('pd_flow_templates')
      .select('*')
      .eq('id', createFlowInput.pd_flow_template_id)
      .single()
      .then(handleResponse);

    // Create the flow in database
    const pdFlowInput = {
      pd_flow_template_id: pdFlowTemplate.id,
      title: createFlowInput.title,
    };

    const newPdFlow = await supabase
      .from('pd_flows')
      .insert(pdFlowInput)
      .select('id')
      .single()
      .then(handleResponse);

    // We now need to update the pd_site, so that it
    // points to the new flow
    await supabase
      .from('pd_sites')
      .update({ pd_flow_id: newPdFlow.id })
      .eq('id', createFlowInput.pd_site_id)
      .select('*, organizations(*)')
      .single()
      .then(handleResponse);

    // Once we have created the flow, then we need to get all the actions belonging to
    // the corresponding template and make a deep copy of each of them. There is no
    // mapping between the new actions and the action_templates that originated them,
    // so that, in order to execute logic, we can only rely on the actions, and not
    // on the action_templates.
    const pdActionTemplates = await supabase
      .from('pd_action_templates')
      .select('*,pd_document_templates(*)')
      .eq('pd_flow_template_id', createFlowInput.pd_flow_template_id)
      .then(handleResponse);

    const actionsToCreate: InsertPdAction[] = pdActionTemplates.map(actionTemplate => ({
      pd_flow_id: newPdFlow.id,
      pd_action_status: actionTemplate.pd_action_type === 'TEMPLATE' ? 'GENERATING' : 'GENERATION_COMPLETED', // We mark only templates as initialised, so they can be picked up from loch
      pd_action_type: actionTemplate.pd_action_type,
      pd_action_template_id: actionTemplate.id, // We need to keep the reference to the pd_action_templates table for later use in loch
      name: actionTemplate.name,
      depends_on: actionTemplate.depends_on,
      key: actionTemplate.key,
    }));

    // We insert the actions into database, where all of them are marked as
    // INITIALISED. They will be in turn picked up by loch
    await supabase
      .from('pd_actions')
      .insert(actionsToCreate)
      .select('*')
      .then(handleResponse);

    // Notify loch, so it can start processing initialised actions and create templates, etc
    await this.httpService
      .axiosRef
      .get(`${ process.env.LOCH_API }/pd-hero/run`)
      .catch(console.error);

    return { id: newPdFlow.id };
  }
}
