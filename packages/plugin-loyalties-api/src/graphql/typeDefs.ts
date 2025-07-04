import {
  attachmentInput,
  attachmentType,
} from '@erxes/api-utils/src/commonTypeDefs';
import gql from 'graphql-tag';
import {
  mutations as donateCampaignMutations,
  queries as donateCampaignQueries,
  types as donateCampaignTypes,
} from './schema/donateCampaign';
import {
  mutations as donateMutations,
  queries as donateQueries,
  types as donateTypes,
} from './schema/donate';
import {
  mutations as spinCampaignMutations,
  queries as spinCampaignQueries,
  types as spinCampaignTypes,
} from './schema/spinCampaign';
import {
  mutations as spinMutations,
  queries as spinQueries,
  types as spinTypes,
} from './schema/spin';
import {
  mutations as lotteryCampaignMutations,
  queries as lotteryCampaignQueries,
  types as lotteryCampaignTypes,
} from './schema/lotteryCampaign';
import {
  mutations as lotteryMutations,
  queries as lotteryQueries,
  types as lotteryTypes,
} from './schema/lottery';
import {
  mutations as voucherCampaignMutations,
  queries as voucherCampaignQueries,
  types as voucherCampaignTypes,
} from './schema/voucherCampaign';
import {
  mutations as voucherMutations,
  queries as voucherQueries,
  types as voucherTypes,
} from './schema/voucher';
import {
  mutations as loyaltyMutations,
  queries as loyaltyQueries,
  types as loyaltyTypes,
} from './schema/loyalty';
import {
  mutations as configMutations,
  queries as configQueries,
  types as configTypes,
} from './schema/config';
import {
  mutation as ScoreLogMutations,
  queries as scoreLogQueries,
  types as scoreLogTypes,
} from './schema/scoreLog';
import {
  mutations as assignmentMutations,
  queries as assignmentQueries,
  types as assignmentTypes,
} from './schema/assignment';
import {
  mutations as assignmentCampaignMutations,
  queries as assignmentCampaignQueries,
  types as assignmentCampaignTypes,
} from './schema/assignmentCampaign';

import {
  mutations as scoreCampaignMutations,
  queries as scoreCampaignQueries,
  types as scoreCampaignTypes,
} from './schema/scoreCampaign';

import {
  mutations as couponCampaignMutations,
  queries as couponCampaignQueries,
  types as couponCampaignTypes,
} from './schema/couponCampaign';

import {
  mutations as couponMutations,
  queries as couponQueries,
  types as couponTypes,
} from './schema/coupon';

import { types as agentTypes, mutations as agentMutations, queries as agentQueries } from './schema/agents';

const typeDefs = async () => {
  return gql`
    scalar JSON
    scalar Date

    enum CacheControlScope {
      PUBLIC
      PRIVATE
    }

    directive @cacheControl(
      maxAge: Int
      scope: CacheControlScope
      inheritMaxAge: Boolean
    ) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION

    ${attachmentType}
    ${attachmentInput}

    ${donateCampaignTypes}
    ${donateTypes}
    ${spinCampaignTypes}
    ${spinTypes}
    ${lotteryCampaignTypes}
    ${lotteryTypes}
    ${voucherCampaignTypes}
    ${voucherTypes}
    ${loyaltyTypes}
    ${configTypes}
    ${scoreLogTypes}
    ${assignmentTypes}
    ${assignmentCampaignTypes}
    ${scoreCampaignTypes}
    ${agentTypes}
    ${couponTypes}
    ${couponCampaignTypes}

    extend type Query {
      ${donateCampaignQueries}
      ${donateQueries}
      ${spinCampaignQueries}
      ${spinQueries}
      ${lotteryCampaignQueries}
      ${lotteryQueries}
      ${voucherCampaignQueries}
      ${voucherQueries}
      ${loyaltyQueries}
      ${configQueries}
      ${scoreLogQueries}
      ${assignmentQueries}
      ${assignmentCampaignQueries}
      ${scoreCampaignQueries}
      ${agentQueries}
      ${couponQueries}
      ${couponCampaignQueries}
    }

    extend type Mutation {
      ${donateCampaignMutations}
      ${donateMutations}
      ${spinCampaignMutations}
      ${spinMutations}
      ${lotteryCampaignMutations}
      ${lotteryMutations}
      ${voucherCampaignMutations}
      ${voucherMutations}
      ${loyaltyMutations}
      ${configMutations}
      ${ScoreLogMutations}
      ${assignmentMutations}
      ${assignmentCampaignMutations}
      ${scoreCampaignMutations}
      ${agentMutations}
      ${couponMutations}
      ${couponCampaignMutations}
    }
  `;
};

export default typeDefs;
