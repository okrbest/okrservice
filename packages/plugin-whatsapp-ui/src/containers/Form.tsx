import { IButtonMutateProps } from '@erxes/ui/src/types';

import { Alert } from '@erxes/ui/src/utils';
import ButtonMutate from '@erxes/ui/src/components/ButtonMutate';
import { IPages } from '@erxes/ui-inbox/src/settings/integrations/types';
import Whatsapp from '../components/Form';
import React from 'react';
import client from '@erxes/ui/src/apolloClient';
import { getRefetchQueries } from '@erxes/ui-inbox/src/settings/integrations/containers/utils';
import { gql } from '@apollo/client';
import { mutations as inboxMutations } from '@erxes/ui-inbox/src/settings/integrations/graphql/index';
import { queries } from '../graphql';

type Props = {
  kind: string;
  type?: string;
  callBack: () => void;
};

type FinalProps = {} & Props;

type State = {
  pages: IPages[];
  accountId?: string;
  loadingPages?: boolean;
};

class WhatsappContainer extends React.Component<FinalProps, State> {
  constructor(props: FinalProps) {
    super(props);

    this.state = { pages: [], loadingPages: false };
  }

  onAccountSelect = (accountId?: string) => {
    if (!accountId) {
      return this.setState({ pages: [], accountId: '' });
    }

    const { kind } = this.props;

    this.setState({ loadingPages: true });

    client
      .query({
        query: gql(queries.whatsappGetNumbers),
        variables: {
          accountId,
          kind
        }
      })
      .then(({ data, loading }: any) => {
        if (!loading) {
          this.setState({
            pages: data.whatsappGetNumbers,
            accountId,
            loadingPages: false
          });
        }
      })
      .catch((error) => {
        Alert.error(error.message);
        this.setState({ loadingPages: false });
      });
  };

  onRemoveAccount = () => {
    this.setState({ pages: [] });
  };

  renderButton = ({
    passedName,
    values,
    isSubmitted,
    callback
  }: IButtonMutateProps) => {
    const { kind } = this.props;
    return (
      <ButtonMutate
        mutation={inboxMutations.integrationsCreateExternalIntegration}
        variables={values}
        callback={callback}
        refetchQueries={getRefetchQueries(kind)}
        isSubmitted={isSubmitted}
        type='submit'
        successMessage={`You successfully added an ${passedName}`}
      />
    );
  };

  render() {
    const { callBack, kind } = this.props;
    const { accountId, pages, loadingPages } = this.state;
    const updatedProps = {
      kind,
      callBack,
      accountId,
      pages,
      loadingPages,
      onAccountSelect: this.onAccountSelect,
      onRemoveAccount: this.onRemoveAccount,
      renderButton: this.renderButton
    };

    return <Whatsapp {...updatedProps} />;
  }
}

export default WhatsappContainer;
