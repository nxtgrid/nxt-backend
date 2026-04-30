import moment from 'moment';
import { HttpException, Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { partition } from 'ramda';

import { NxtSupabaseUser } from '../auth/nxt-supabase-user';
import { HttpService } from '@nestjs/axios';

const FormData = require('form-data');

@Injectable()
export class PdActionsService {

  constructor(
    private readonly httpService: HttpService,
  ) {}

  // TODO: need to add ACL to make.com in order to make it more secure
  private async uploadFile(name: string, folderId: string, file: Express.Multer.File) {
    const data = new FormData();
    data.append('hero_file', Readable.from(file.buffer));
    data.append('name', name);
    data.append('folder_id', folderId);

    const headers = data.getHeaders();
    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${ process.env.MAKE_API_URL }/${ process.env.MAKE_UPLOAD_FLOW_ID }`,
      headers,
      data,
    };

    const { data: receivedData } = await this.httpService.axiosRef.request(config);
    return receivedData.document_id;
  }

  // Processes the upload of a document.
  private async execUpload(pdAction, author, file: Express.Multer.File) {
    const { handleResponse, client: supabase } = author.supabase;

    // Given the action, upload to google drive folder
    const uploadedDocumentName = `${ pdAction.name } ${ moment( pdAction.created_at).format('YYYY-MM-DD HH:mm') }`;
    const uploadedDocumentId = await this.uploadFile(uploadedDocumentName, pdAction.pd_flows.google_folder_id, file);

    // Now that we have the id of the uploaded document
    // create a new row in pd_documents
    const pdDocument = await supabase
      .from('pd_documents')
      .insert([
        {
          title: uploadedDocumentName,
          pd_action_id: pdAction.id,
          google_drive_document_id: uploadedDocumentId,
        },
      ])
      .select('*')
      .single()
      .then(handleResponse);

    // We also update the latest_upload, so we can keep track of the
    // different documents that have been uploaded
    await supabase
      .from('pd_actions')
      .update({ latest_pd_document_id: pdDocument.id })
      .eq('id', pdAction.id)
      .select('*')
      .then(handleResponse);

    return pdDocument;
  }

  // Processes an external event, such as the manual submission of a document to an authority,
  // or an update from said authority.
  private async  execExternal(pdAction, author) {
    const { handleResponse, client: supabase } = author.supabase;

    return supabase
      .from('pd_actions')
      .update({ pd_action_status: 'ACTION_COMPLETED' }) //TODO: should this be fixed?
      .eq('id', pdAction.id)
      .select('*')
      .then(handleResponse);
  }

  private async execSignature() {

  }

  async exec(actionId: number, author: NxtSupabaseUser, file: Express.Multer.File) {
    // Find the corresponding action in database
    const { handleResponse, client: supabase } = author.supabase;
    const pdAction = await supabase
      .from('pd_actions')
      .select('*, pd_flows(*)')
      .eq('id', actionId)
      .single()
      .then(handleResponse);

    let message: string = '';
    switch (pdAction.pd_action_type) {
      case 'UPLOAD':
        await this.execUpload(pdAction, author, file);
        message = `${ author.account.full_name } has uploaded a new document to ${ pdAction.pd_flows.title }`;
        break;
      case 'EXTERNAL':
        await this.execExternal(pdAction, author);
        message = `${ author.account.full_name } has reported a new event for ${ pdAction.pd_flows.title }`;
        break;
      // TODO: add signature flow
      default:
        throw new HttpException(`Could not find pd action type for pd action ${ pdAction.id }: got ${ pdAction.pd_action_type } instead`, 500);
    }

    // We calculate the new actions to be updated
    const { accumulator: pd_actions } = await this.generateNewState(pdAction.pd_flows.id, author);

    // We update every action
    // @TOMMASO :: This does not need to be sequential. You could also use .upsert to update many.
    await supabase
      .from('pd_actions')
      .upsert(pd_actions.map(({ id, pd_action_status }) => ({ id, pd_action_status })))
      .select('*')
      .then(handleResponse)
    ;

    // TODO: Add audit
    await supabase
      .from('pd_audits')
      .insert({
        author_id: author.account.id,
        pd_action_id: pdAction.id,
        message,
      })
      .then(handleResponse)
    ;

    return {
      id: actionId,
    };
  }

  // Given a flow, this function recalculates the state of each action
  // by looking at the dependencies for each
  public async generateNewState(flowId: number, author: NxtSupabaseUser) {
    const { handleResponse, client: supabase } = author.supabase;

    // We fetch all the actions
    const actions = await supabase
      .from('pd_actions')
      .select('*')
      .eq('pd_flow_id', flowId)
      .then(handleResponse);

    // We start from the end node of the flow to determine the state of
    // the tree
    const endAction = actions.find(action => action.pd_action_type === 'END');
    if(!endAction) throw new HttpException(`Flow ${ flowId } does not seem to have an END action. Please add one`, 500);

    const res = this.evaluate(actions, endAction, []);

    // Once we know what actions do not depend on anything, then we can
    // mark their state as SUCCESSFUL. After that, we find all the actions
    // that depend on them. Once we have the new list, then repeat
    // the process recursively.
    return res;
  }

  determineActionStatus(action) {
    let status;
    if(action.pd_action_type === 'START')
      status = 'ACTION_COMPLETED';
    if(action.pd_action_type === 'END')
      status = 'ACTION_COMPLETED';
    else if(action.pd_action_type === 'EXTERNAL')
      status = action.pd_action_status;
    else if(action.pd_action_type === 'UPLOAD')
      status = action.latest_pd_document_id ? 'ACTION_COMPLETED' : 'ACTIONABLE';
    else if(action.pd_action_type === 'TEMPLATE')
      status = action.google_drive_document_id ? 'ACTION_COMPLETED' : 'ACTIONABLE';

    return status;
  }

  // This function is essentially a recursive reduce, that starts at the
  // end node and goes backwards. Every previous action can depend on
  // one or more actions, etc. Dependencies can be AND/OR, in groups.
  // We use s-expressions in JSON format to determine them.
  evaluate(pdActions, action, accumulator) {
    const dependsOn = action.depends_on;

    // Base condition: if an action does not depend on any other, then
    // we can use ONLY its properties to find out what the status is
    if(dependsOn.length < 1) {
      const actionPdStatus = this.determineActionStatus(action);
      const computedAction = {
        ...action,
        pd_action_status: actionPdStatus,
      };
      accumulator.push(computedAction);
      return { pd_action: computedAction, accumulator };
    }

    // First we do an operator check, otherwise there is no point in doing anything
    const operator = dependsOn[0];
    if(![ 'AND', 'OR' ].includes(operator)) throw new HttpException(`${ JSON.stringify(dependsOn) } is an invalid s-expression (first element must be AND/OR)`, 500);

    // We get all the operands in the array
    const operands = dependsOn.slice(1);

    // Among the operands, separate the expressions (eg ["AND", 1, 2]) from strings (eg "AND", "OR") and simple actions (eg 1, 2)
    const [ expressions, actionKeys ] = partition(element => Array.isArray(element) && typeof element !== 'string', operands);

    // Given the keys, we extract the corresponding actions to be processed
    // in the next iteration
    const actionsUpNext = actionKeys.map(key => pdActions.find(act => act.key === key));
    // If there is an expression instead, we need to treat them as virtual actions,
    // in the sense that we can create a new action marked as is_virtual that behaves
    // like a normal one. At the end we will remove the virtual actions from
    // the accumulator before returning the result
    // ["AND", 1, ["OR", 3, 4, ["AND", 5, 6]], ["AND", 3, 4]]
    const virtualActions = expressions.map(exp => ({
      depends_on: exp,
      is_virtual: true,
    }));

    const allResults = [
      ...actionsUpNext,
      ...virtualActions,
    ];

    const currentActionStatus = this.determineActionStatus(action);

    const evaluatedActions = allResults.map(nmAction => this.evaluate(pdActions, nmAction, accumulator));
    const allResultsStatuses = evaluatedActions.map(res => res.pd_action.pd_action_status);
    const allResultsStatusesWithCurrent = [ ...allResultsStatuses, currentActionStatus ];
    const successfulComputedOperands = allResultsStatusesWithCurrent.filter(status => status === 'ACTION_COMPLETED');

    let computedActionStatus;
    if(operator === 'AND' && successfulComputedOperands.length === allResultsStatusesWithCurrent.length) computedActionStatus = 'ACTION_COMPLETED';
    else if(operator === 'OR' && successfulComputedOperands.length > 0) computedActionStatus = 'ACTION_COMPLETED';
    else computedActionStatus = 'ACTIONABLE';

    const computedAction = {
      ...action,
      pd_action_status: computedActionStatus,
    };

    accumulator.push(computedAction);

    return {
      pd_action: computedAction,
      accumulator,
    };
  }
}
