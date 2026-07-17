import dotenv from 'dotenv'

dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ path: '.env', quiet: true })

import { getAdminFirestore } from '../lib/firebase-admin'

async function main() {
  const db = getAdminFirestore()
  const childrenSnap = await db.collection('children').get()

  console.log(`Found ${childrenSnap.size} children`)

  for (const childDoc of childrenSnap.docs) {
    const sessionsSnap = await db.collection('sessions').where('childId', '==', childDoc.id).get()

    let totalStars = 0
    for (const sessionDoc of sessionsSnap.docs) {
      totalStars += Number(sessionDoc.data().stars) || 0
    }
    const sessionCount = sessionsSnap.size

    await childDoc.ref.update({ totalStars, sessionCount })

    console.log(`${childDoc.id} (${childDoc.data().name ?? 'unnamed'}): totalStars=${totalStars} sessionCount=${sessionCount}`)
  }

  console.log('Backfill complete.')
}

main().catch(err => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
