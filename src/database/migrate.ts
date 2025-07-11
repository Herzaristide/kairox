import { pgPool } from './connection';

export const runMigrations = async (): Promise<void> => {
  try {
    console.log('Running database migrations...');

    // Check if tables exist
    const tableCheck = await pgPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('No tables found, running initial schema...');
      // In a real application, you would read and execute the schema.sql file here
      console.log(
        'Please run the schema.sql file manually or through Docker init scripts'
      );
    } else {
      console.log(
        'Tables already exist:',
        tableCheck.rows.map((r) => r.table_name)
      );
    }

    console.log('Migrations completed');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
