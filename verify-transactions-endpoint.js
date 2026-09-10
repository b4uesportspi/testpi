import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Verifying transactions endpoint implementation...');

// Check if the main-clean.ts file has the handleTransactions function
import { readFileSync } from 'fs';
import { join } from 'path';

const mainCleanPath = join(process.cwd(), 'api', 'main-clean.ts');
const mainCleanContent = readFileSync(mainCleanPath, 'utf8');

// Check if handleTransactions function exists
const hasHandleTransactions = mainCleanContent.includes('async function handleTransactions');
console.log('✅ handleTransactions function exists:', hasHandleTransactions);

// Check if success_reason and failure_reason are included in the SQL query
const hasSuccessReasonInQuery = mainCleanContent.includes('t.success_reason');
const hasFailureReasonInQuery = mainCleanContent.includes('t.failure_reason');
console.log('✅ success_reason in SQL query:', hasSuccessReasonInQuery);
console.log('✅ failure_reason in SQL query:', hasFailureReasonInQuery);

// Check if successReason and failureReason are mapped in the response
const hasSuccessReasonInMapping = mainCleanContent.includes('successReason: row.success_reason');
const hasFailureReasonInMapping = mainCleanContent.includes('failureReason: row.failure_reason');
console.log('✅ successReason mapped in response:', hasSuccessReasonInMapping);
console.log('✅ failureReason mapped in response:', hasFailureReasonInMapping);

// Check if the schema has the columns
const schemaPath = join(process.cwd(), 'shared', 'schema.ts');
const schemaContent = readFileSync(schemaPath, 'utf8');

const hasSuccessReasonInSchema = schemaContent.includes('successReason: text("success_reason")');
const hasFailureReasonInSchema = schemaContent.includes('failureReason: text("failure_reason")');
console.log('✅ success_reason in schema:', hasSuccessReasonInSchema);
console.log('✅ failure_reason in schema:', hasFailureReasonInSchema);

console.log('\\nSummary:');
if (hasHandleTransactions && hasSuccessReasonInQuery && hasFailureReasonInQuery && 
    hasSuccessReasonInMapping && hasFailureReasonInMapping && 
    hasSuccessReasonInSchema && hasFailureReasonInSchema) {
  console.log('✅ All transaction reason fields are properly implemented!');
} else {
  console.log('❌ Some transaction reason fields are missing or not properly implemented.');
  console.log('Please check the implementation.');
}