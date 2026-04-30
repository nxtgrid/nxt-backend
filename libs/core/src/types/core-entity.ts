import { CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

export abstract class CoreEntity {
  @PrimaryGeneratedColumn()
    id: number;

  @CreateDateColumn({ type: 'timestamptz', precision: 3, default: () => 'now()' })
    created_at: Date;
}
