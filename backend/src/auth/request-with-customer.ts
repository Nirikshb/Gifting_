import { Customer } from '../customers/entities/customer.entity';

export type RequestWithCustomer = {
  customer?: Customer;
};
