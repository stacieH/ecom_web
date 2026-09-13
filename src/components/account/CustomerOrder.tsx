'use client';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import formStyles from '@/components/forms/form.module.css';
import OrderActions from '@/components/ordering/OrderActions';
import OrderDetails from '@/components/ordering/OrderDetails';
import { ApiError } from '@/lib/api/client';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import RequireCustomer from './RequireCustomer';

function OrderView({ reference }: { reference: string }) {
  const client = useOrderingClient();
  const queryClient = useQueryClient();
  const order = useQuery({
    queryKey: orderingKeys.order(reference),
    queryFn: () => client.getOrder(reference),
  });

  const backLink = (
    <Link className={formStyles.link} href="/account/orders">
      Back to your orders
    </Link>
  );

  if (order.isError) {
    const notFound = order.error instanceof ApiError && order.error.errorCode === 'ORDER_NOT_FOUND';
    return (
      <div className={formStyles.notice}>
        <p role="alert">
          {notFound ? 'We couldn’t find that order.' : 'We couldn’t load this order. Please try again.'}
        </p>
        {backLink}
      </div>
    );
  }

  if (!order.data) {
    return (
      <p className={formStyles.status} role="status">
        Loading your order…
      </p>
    );
  }

  return (
    <>
      {backLink}
      <OrderDetails order={order.data} />
      <OrderActions
        order={order.data}
        onCancel={async () => {
          const updated = await client.cancelOrder(reference);
          queryClient.setQueryData(orderingKeys.order(reference), updated);
          void queryClient.invalidateQueries({ queryKey: orderingKeys.orders });
          return updated;
        }}
        onResumePayment={() => client.resumeOrderPayment(reference)}
      />
    </>
  );
}

export default function CustomerOrder({ reference }: { reference: string }) {
  return <RequireCustomer>{() => <OrderView reference={reference} />}</RequireCustomer>;
}
