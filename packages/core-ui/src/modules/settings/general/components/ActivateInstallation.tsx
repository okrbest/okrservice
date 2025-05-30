import client from 'apolloClient';
import { gql } from '@apollo/client';
import Button from 'modules/common/components/Button';
import {
  ControlLabel,
  FormControl,
  FormGroup
} from 'modules/common/components/form';
import Info from 'modules/common/components/Info';
import { __, Alert } from 'modules/common/utils';
import React, { useEffect, useState } from 'react';
import { mutations, queries } from '@erxes/ui-settings/src/general/graphql';

const ActivateInstallation = () => {
  const [token, setToken] = useState('');
  const [activated, setActivated] = useState(false);

  const hostname = window.location.hostname;

  useEffect(() => {
    client
      .query({
        query: gql(queries.checkActivateInstallation),
        variables: {
          hostname
        }
      })
      .then(() => {
        setActivated(true);
      })
      .catch(e => {
        console.error('while checking activation: ', e.message);
      });
  }, [hostname]);

  const onSubmit = e => {
    e.preventDefault();

    client
      .mutate({
        mutation: gql(mutations.activateInstallation),
        variables: {
          token,
          hostname
        }
      })
      .then(() => {
        Alert.info('Successfully activated');

        setActivated(true);
      })
      .catch((error: any) => {
        Alert.error(error.message);
      });
  };

  const onChange = e => {
    setToken(e.target.value);
  };

  if (activated) {
    return <Info>{__("Already activated")}</Info>;
  }

  return (
    <form onSubmit={onSubmit}>
      <FormGroup>
        <ControlLabel required={true}>Token</ControlLabel>

        <FormControl
          onChange={onChange}
          value={token}
          name="token"
          required={true}
          autoFocus={true}
          type="password"
          autoComplete="new-password"
        />
      </FormGroup>
      <Button btnStyle="success" type="submit" icon="check-circle">
        Activate
      </Button>
    </form>
  );
};

export default ActivateInstallation;
