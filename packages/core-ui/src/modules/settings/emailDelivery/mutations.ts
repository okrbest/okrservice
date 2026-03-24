const removeEmailDelivery = `
  mutation removeEmailDelivery($_id: String!) {
    removeEmailDelivery(_id: $_id)
  }
`;

export default {
  removeEmailDelivery,
};
