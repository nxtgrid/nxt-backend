import { PhaseEnum } from '@core/types/device-messaging';
import { MeterInteractionTypeEnum } from '@core/types/supabase-types';
import { round } from '@helpers/number-helpers';
import { isNotNil, mean, sum, values } from 'ramda';

type ThreePhaseValues = Record<PhaseEnum, number>;

type ThreePhaseAggregation = {
  voltage?: number;
  power?: number;
  current?: number;
  phase: ThreePhaseValues;
}

export const allPhases: PhaseEnum[] = [ 'A', 'B', 'C' ];

const propertyConfig = {
  READ_VOLTAGE: { key: 'voltage', aggregator: 'mean' },
  READ_POWER: { key: 'power', aggregator: 'sum' },
  READ_CURRENT: { key: 'current', aggregator: 'mean' },
};

export const aggregateThreePhaseResponse = (
  interaction: {
    meter_interaction_type: MeterInteractionTypeEnum,
    result_value?: Record<string, any>,
  },
  phase: PhaseEnum,
  phaseResult?: Record<string, number>,
): ThreePhaseAggregation => {
  const { key, aggregator } = propertyConfig[interaction.meter_interaction_type];

  const priorAggregate = interaction.result_value?.[key];
  const priorPhaseObj = interaction.result_value?.phase ?? {};

  if(!phaseResult) return {
    [key]: priorAggregate ?? null,
    phase: {
      ...priorPhaseObj,
      [phase]: null,
    },
  };

  const _phaseValues = { ...priorPhaseObj, [phase]: phaseResult[key] };

  const allResults: number[] = values(_phaseValues).filter(isNotNil);
  const _aggregate = allResults.length > 0
    ? round(aggregator === 'mean' ? mean(allResults) : sum(allResults), 1)
    : null;

  return {
    [key]: _aggregate,
    phase: _phaseValues,
  };

  /*
    READ_VOLTAGE:
    {
      voltage: // Mean of the already read voltages
      phase: {
        A: 220.1
        B: 229.5
        C: 225.4
      }
    }
    READ_POWER:
    {
      power: // Sum of the already read powers
      phase: {
        A: 0.4
        B: 0.6
        C: 0.5
      }
    }
    READ_CURRENT:
    {
      current: // Mean of the already read currents
      phase: {
        A: 50
        B: 52
        C: 48
      }
    }
  */
};
