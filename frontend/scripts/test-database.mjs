export function assertTestDatabase(database){
  if(!database?.startsWith('jdbc:mysql:'))throw Error('Tests require an isolated MySQL database.');
  const name=new URL(database.slice(5)).pathname.slice(1);
  if(!/^[a-zA-Z0-9_]+_(e2e|test|persistence)$/.test(name))throw Error('Refusing to run tests against a database without an _e2e, _test or _persistence suffix.');
}
