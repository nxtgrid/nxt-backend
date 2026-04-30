import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@core/modules/supabase.module';
import { InsertIssue, UpdateIssue } from '@core/types/supabase-types';
import { ISSUE_PRIORITIES_MAP } from './constants/issue-config-map';

/**
 * This is just a sketch of how issues service could be simplified, using Supabase
 * And also make it so it can be called and run from elsewhere without double fetching of data
 */

@Injectable()
export class IssuesServiceNew {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  async upsertIssuesByMeter(meter): Promise<{ newIssueId: number } | null> {
    const existingIssue = meter.issue?.issue_status === 'OPEN' ? meter.issue : null;
    const openNewIssueDto = this.analyseMeterForNewIssues(meter);

    if(
      !existingIssue && !openNewIssueDto ||
      existingIssue.issue_type === openNewIssueDto.issue_type
    ) return null;
    if(!existingIssue && openNewIssueDto) {
      const { id } = await this.supabaseService.adminClient
        .from('issues')
        .insert(openNewIssueDto)
        .select('id')
        .single()
        .then(this.supabaseService.handleResponse)
      ;
      return { newIssueId: id };
    }

    const closeExistingIssueDto = this.closeIssueIfPossible(existingIssue, meter);
    if(closeExistingIssueDto && !openNewIssueDto) {
      await this.supabaseService.adminClient
        .from('issues')
        .update(closeExistingIssueDto)
        .eq('id', existingIssue.id)
        .then(this.supabaseService.handleResponse)
      ;
      return null;
    }
    if(closeExistingIssueDto && openNewIssueDto) {
      // Upserts are tedious, may be we just do two calls (logic flow could change then)
      const ids = await this.supabaseService.adminClient
        .from('issues')
        .upsert([
          openNewIssueDto,
          // Recast because that's what Supabase requires
          { ...closeExistingIssueDto, id: existingIssue.id } as InsertIssue,
        ] /*, whatever options are required */)
        .eq('id', existingIssue.id)
        .select('id')
        .then(this.supabaseService.handleResponse)
      ;
      const newIssueId = ids.filter(({ id }) => id !== existingIssue.id)[0].id;
      return { newIssueId };
    }
    // If we still have an OPEN existing issue and an OPEN new issue, we need to compare their priorities
    const exitingPriority = ISSUE_PRIORITIES_MAP[existingIssue.issue_type];
    const newPriority = ISSUE_PRIORITIES_MAP[openNewIssueDto.issue_type];
    // @TO-DISCUSS-WITH-TOMMASO :: Issues service line 280; it seems we close more important issues there?
    // If the older one is more important, we keep that and do nothing further
    if(exitingPriority > newPriority) return null;

    // Otherwise we override the existing one and open the new oen
    const ids = await this.supabaseService.adminClient
      .from('issues')
      .upsert([
        openNewIssueDto,
        // Recast because that's what Supabase requires
        {
          id: existingIssue.id,
          issue_status: 'OVERRIDDEN',
          closed_at: 'now',
        } as InsertIssue,
      ] /*, whatever options are required */)
      .eq('id', existingIssue.id)
      .select('id')
      .then(this.supabaseService.handleResponse)
    ;
    const newIssueId = ids.filter(({ id }) => id !== existingIssue.id)[0].id;
    return { newIssueId };
  }

  private analyseMeterForNewIssues(meter): InsertIssue | null {
    if(meter.this_is_bad) return {
      issue_status: 'OPEN',
      issue_type: 'NO_CREDIT',
    };

    return null;
  }

  private closeIssueIfPossible(issue, _meter): UpdateIssue | null {
    if(!issue) return null;
    const wecancloseit = true;

    if(wecancloseit) return {
      issue_status: 'CLOSED',
      closed_at: 'now',
    };

    return null;
  }
}

// What would be a good, generic way to approach issues?
// We can always create a CLOSE DTO for the latest issue based on the meter state first, regardless of the rest
// We can always create an OPEN DTO based on the meter state
// If we have both a CLOSE and an OPEN, do both (upsert)
// If we have an EXISTING OPEN and a NEW OPEN, check the priorities:
//    if EXISTING OPEN priority is higher, no-op
//    if NEW OPEN priority is higher, close EXISTING OPEN and open NEW OPEN (upsert)

