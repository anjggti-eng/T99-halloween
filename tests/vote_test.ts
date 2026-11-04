import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, doc, runTransaction, increment, writeBatch } from 'firebase/firestore';
import config from '../firebase-applet-config.json';

const app = initializeApp(config);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

async function runTest() {
  console.log('--- Starting Vote Test (100 simultaneous) ---');
  const pollId = 'test_poll';
  const optionId = 'test_option';
  
  // Cleanup
  const votes = await getDocs(collection(db, 'votes'));
  const batch = writeBatch(db);
  votes.forEach(v => batch.delete(v.ref));
  
  // Seed
  batch.set(doc(db, 'polls', pollId), { title: 'Test' });
  batch.set(doc(db, 'options', optionId), { pollId, text: 'Test Option', vote_count: 0 });
  await batch.commit();

  // Simulate 100 votes
  const votePromises = Array.from({ length: 100 }).map((_, i) => {
    const voterId = `voter_${i}`;
    const voteDocId = `vote_${pollId}_${voterId}`;
    return runTransaction(db, async (transaction) => {
      const voteRef = doc(db, 'votes', voteDocId);
      const optionRef = doc(db, 'options', optionId);
      
      transaction.set(voteRef, { pollId, optionId, voterId, createdAt: new Date() });
      transaction.update(optionRef, { vote_count: increment(1) });
    });
  });

  const results = await Promise.allSettled(votePromises);
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  console.log('Successful votes:', successCount);
  
  // Check counts
  const optionSnap = await getDoc(doc(db, 'options', optionId));
  console.log('Option vote_count:', optionSnap.data()?.vote_count);
  
  if (successCount === 100 && optionSnap.data()?.vote_count === 100) {
    console.log('--- Test Passed ---');
    process.exit(0);
  } else {
    console.log('--- Test Failed ---');
    process.exit(1);
  }
}

runTest().catch(console.error);
