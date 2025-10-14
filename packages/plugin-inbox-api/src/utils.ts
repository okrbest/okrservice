import { getService, getServices } from '@erxes/api-utils/src/serviceDiscovery';
import { getEnv } from '@erxes/api-utils/src/core';
import { sendCoreMessage } from './messageBroker';

export const getConfig = async (
  code: string,
  defaultValue?: string,
  models?: any,
  subdomain?: string
) => {
  // subdomain이 있으면 core에서 config 가져옴
  if (subdomain) {
    return sendCoreMessage({
      subdomain,
      action: 'getConfig',
      data: { code, defaultValue },
      isRPC: true,
      defaultValue
    });
  }
  
  return getEnv({ name: code, defaultValue }) || defaultValue;
};

export const getIntegrationMeta = async () => {
  const serviceNames = await getServices();
  let metas: any = [];

  for (const serviceName of serviceNames) {
    const service = await getService(serviceName);
    const inboxIntegrations =
      (service.config.meta || {}).inboxIntegrations || [];

    if (inboxIntegrations && inboxIntegrations.length > 0) {
      metas = metas.concat(inboxIntegrations);
    }
  }

  return metas;
};

export const getIntegrationsKinds = async () => {
  const metas = await getIntegrationMeta();

  const response = {
    messenger: 'Messenger',
    lead: 'Popups & forms',
    webhook: 'Webhook',
    callpro: 'Callpro',
  };

  for (const meta of metas) {
    response[meta.kind] = meta.label;
  }

  return response;
};

export const isServiceRunning = async (
  integrationKind: string,
): Promise<boolean> => {
  const serviceNames = await getServices();

  // some kinds are separated by -
  return (
    !!integrationKind && serviceNames.includes(integrationKind.split('-')[0])
  );
};
