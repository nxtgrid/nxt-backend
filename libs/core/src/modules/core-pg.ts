import { Global, Module, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

/**
 * Service that provides a PostgreSQL connection pool using the pg client.
 * This service manages the connection pool lifecycle and provides query methods.
 */
@Injectable()
export class PgService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  async onModuleInit(): Promise<void> {
    // Test the connection
    try {
      this.pool = new Pool({
        host: process.env.NXT_DB_HOST,
        port: Number(process.env.NXT_DB_PORT),
        user: process.env.NXT_DB_USERNAME,
        password: process.env.NXT_DB_PASSWORD,
        database: process.env.NXT_DB_NAME,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      });

      // Handle pool errors
      this.pool.on('error', err => {
        console.error('Unexpected error on idle client', err);
      });

      await this.pool.query('SELECT NOW()');
    }
    catch (error) {
      console.error('Failed to connect to PostgreSQL database', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Execute a query using the connection pool.
   * @param text - SQL query text
   * @param params - Query parameters
   * @returns Promise resolving to the query result
   */
  async query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
    return this.pool.query(text, params).then(({ rows }) => rows);
  }

  /**
   * Get a client from the pool for transaction management.
   * Remember to release the client when done using client.release().
   * @returns Promise resolving to a PoolClient
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Get the underlying pool instance.
   * Use with caution - prefer using query() or getClient() methods.
   * @returns The PostgreSQL Pool instance
   */
  getPool(): Pool {
    return this.pool;
  }
}

/**
 * Global module that provides PostgreSQL connection using the pg client.
 * This module can be imported once in the root AppModule and will be available
 * throughout the application via dependency injection.
 */
@Global()
@Module({
  providers: [ PgService ],
  exports: [ PgService ],
})
export class CorePgModule {}
