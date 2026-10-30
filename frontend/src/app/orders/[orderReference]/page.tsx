import Link from "next/link";
import { ApiError, fetchOrder } from "@/src/lib/api";
import { formatProductPrice } from "@/src/lib/product-display";
import styles from "./page.module.css";

type ThankYouPageProps = {
  params: Promise<{ orderReference: string }>;
};

export async function generateMetadata({ params }: ThankYouPageProps) {
  const { orderReference } = await params;
  return {
    title: `Order ${orderReference} | Gift Packaging`,
  };
}

export default async function ThankYouPage({ params }: ThankYouPageProps) {
  const { orderReference } = await params;

  try {
    const order = await fetchOrder(orderReference);

    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1>Thank you</h1>
          <p className={styles.muted}>
            Your order is placed and unpaid. Keep this reference:{" "}
            <strong>{order.orderReference}</strong>
          </p>
          <div className={styles.panel}>
            <p>Status: {order.orderStatus}</p>
            <p>Payment: {order.paymentStatus}</p>
            <ul>
              {order.items.map((item) => (
                <li key={`${item.productName}-${item.quantity}-${item.lineTotal}`}>
                  <span>
                    {item.productName} × {item.quantity}
                  </span>
                  <span>{formatProductPrice(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <p className={styles.total}>
              Total {formatProductPrice(order.totalAmount)}
            </p>
          </div>
          <p>
            <Link href="/products">Back to products</Link>
          </p>
        </div>
      </div>
    );
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "This order could not be loaded.";

    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1>Order not available</h1>
          <p className={styles.muted}>{message}</p>
          <p>
            <Link href="/products">Back to products</Link>
          </p>
        </div>
      </div>
    );
  }
}
