import { DataSource } from 'typeorm';

require('dotenv-safe').config();
const { DATABASE_URL, DATABASE_PORT, DATABASE_USERNAME, DATABASE_DB_NAME, DATABASE_PASSWORD } = process.env;

export const connectionSource = new DataSource({
  migrationsTableName: 'migrations',
  type: 'postgres',
  host: DATABASE_URL,
  port: Number(DATABASE_PORT),
  username: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_DB_NAME,
  logging: false,
  migrationsTransactionMode: 'none',
  synchronize: false,
  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
  name: 'default',
  entities: [ './src/**/entities/*.entity.ts' ],
  migrations: [ './migration/*.ts' ],
  subscribers: [ 'src/subscriber/**/*{.ts,.js}' ],
});
