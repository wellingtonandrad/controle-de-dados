/**
 * Webhooks Stripe de assinatura SaaS: persistência em `Subscription` foi removida do schema.
 * Mantido como no-op para não quebrar o endpoint de webhook.
 */
export async function manageSubscription(
  _subscriptionId: string,
  _customerId: string,
  _createAction = false,
  _deleteAction = false,
  _type?: string,
) {}
