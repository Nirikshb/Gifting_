import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerSession } from './customer-session.entity';

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

  @OneToMany(() => CustomerSession, (session) => session.customer)
  sessions!: CustomerSession[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
