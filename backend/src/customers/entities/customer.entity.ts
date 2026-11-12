import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerSession } from './customer-session.entity';

export const CUSTOMER_ROLES = ['customer', 'admin'] as const;
export type CustomerRole = (typeof CUSTOMER_ROLES)[number];

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'google_sub', unique: true, length: 255 })
  googleSub!: string;

  @Column({ length: 255 })
  email!: string;

  @Column({ name: 'display_name', length: 150 })
  displayName!: string;

  /**
   * Reuses the existing session identity: admin access is a role on the
   * customer account, not a second authentication system.
   */
  @Column({ type: 'varchar', length: 16, default: 'customer' })
  role!: CustomerRole;

  @OneToMany(() => CustomerSession, (session) => session.customer)
  sessions!: CustomerSession[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
