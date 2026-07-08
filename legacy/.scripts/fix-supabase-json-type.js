#!/usr/bin/env node

/**
 * Post-processing script to fix the Json type in generated Supabase types.
 * 
 * The default Json type from Supabase is a recursive union that causes
 * TypeScript errors when accessing properties. This script replaces it
 * with a more practical Record<string, any> type.
 */

const fs = require('fs');
const path = require('path');

const TARGET_FILE = path.join(__dirname, '../libs/core/src/types/supabase-types.ts');

try {
  let content = fs.readFileSync(TARGET_FILE, 'utf8');
  
  // Find and replace the Json type definition
  // The default Supabase Json type is a recursive union that spans multiple lines
  const jsonTypeRegex = /export type Json =[\s\S]*?\| Json\[\];/;
  
  const newJsonType = 'export type Json = Record<string, any>';
  
  if (content.includes('export type Json =') && content.includes('| Json[]')) {
    content = content.replace(jsonTypeRegex, newJsonType);
    fs.writeFileSync(TARGET_FILE, content, 'utf8');
    console.log('✓ Successfully updated Json type definition');
  } else {
    console.log('⚠ Json type not found or already modified, skipping...');
  }
} catch (error) {
  console.error('✗ Error fixing Json type:', error.message);
  process.exit(1);
}

