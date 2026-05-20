import robot from './robot';
import users from './users';
import rpa from './rpa';

let subscriptions: any = {
  ...robot,
  ...users,
  ...rpa,
};

const { NODE_ENV } = process.env;

// disable subscriptions in test mode
if (NODE_ENV === 'test') {
  subscriptions = {};
}

export default subscriptions;
