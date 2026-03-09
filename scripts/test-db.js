import mysql from 'mysql2/promise';

const host = 'db-dtx-03.apollopanel.com';
const password = 'lvlArAo+39TNw.SLQvyZU@kV';
const database = 's212344_premium';

const usernames = [
  'u212344_7gTqh1Vch4',
  'u212344_7gTqhIVch4',
  'u212344_7gTqhlVch4',
  'u212344_7gTqhiVch4', // i
];

async function test() {
  for (const user of usernames) {
    try {
      console.log(`Trying user: ${user}`);
      const connection = await mysql.createConnection({
        host,
        user,
        password,
        database
      });
      console.log(`SUCCESS with user: ${user}`);
      await connection.end();
      return;
    } catch (err) {
      console.log(`Failed with user: ${user} - ${err.message}`);
    }
  }
}

test();
