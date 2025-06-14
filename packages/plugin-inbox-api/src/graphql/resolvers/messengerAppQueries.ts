import { IContext } from "../../connectionResolver";

interface IWebsite {
  description?: string;
  buttonText?: string;
  url?: string;
  openInNewWindow?: boolean;
}

interface ILead {
  formCode: string;
}

interface IKnowledgebase {
  topicId: string;
}

const messengerAppsQueries = {
  /**
   * MessengerApps list
   */
  async messengerApps(
    _root,
    { integrationId }: { integrationId: string },
    { models }: IContext
  ) {
    const apps = await models.MessengerApps.find({
      "credentials.integrationId": integrationId,
    });

    const websites: IWebsite[] = [];
    const knowledgebases: IKnowledgebase[] = [];
    const leads: ILead[] = [];

    for (const app of apps) {
      const credentials: any = app.credentials;

      if (app.kind === "website") {
        websites.push({
          description: credentials.description || "",
          buttonText: credentials.buttonText || "",
          url: credentials.url || "",
          openInNewWindow: credentials.openInNewWindow,
        });
      }

      if (app.kind === "knowledgebase") {
        knowledgebases.push({ topicId: credentials.topicId });
      }

      if (app.kind === "lead") {
        leads.push({ formCode: credentials.formCode });
      }
    }

    return { websites, knowledgebases, leads };
  },
};

export default messengerAppsQueries;
