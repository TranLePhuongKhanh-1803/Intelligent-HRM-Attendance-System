/**
 * Face recognition utility functions
 * Compares 512-dimensional face embeddings using Cosine Distance (Facenet512)
 * 
 * Supports multi-sample embeddings.
 */

// Calculate Cosine Distance between two 512-d vectors
const cosineDistance = (a, b) => {
  if (!a || !b || a.length !== b.length) return Infinity;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  if (normA === 0 || normB === 0) return Infinity;
  return 1 - (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)));
};

/**
 * Extract individual 512-d embeddings from a user's faceEmbedding array.
 */
const extractEmbeddings = (faceEmbedding) => {
  if (!faceEmbedding || faceEmbedding.length === 0) return [];
  
  const EMBEDDING_DIM = 512;
  const embeddings = [];
  
  if (faceEmbedding.length === EMBEDDING_DIM) {
    embeddings.push(faceEmbedding);
  } else if (faceEmbedding.length % EMBEDDING_DIM === 0) {
    const count = faceEmbedding.length / EMBEDDING_DIM;
    for (let i = 0; i < count; i++) {
      embeddings.push(faceEmbedding.slice(i * EMBEDDING_DIM, (i + 1) * EMBEDDING_DIM));
    }
  } else {
    embeddings.push(faceEmbedding.slice(0, Math.min(EMBEDDING_DIM, faceEmbedding.length)));
  }
  
  return embeddings;
};

/**
 * Find the best matching user from a face embedding.
 * DeepFace Facenet512 recommended Cosine distance threshold is 0.236.
 */
const findMatchingUser = (embedding, users, threshold = 0.236) => {
  let bestMatch = null;
  let bestDistance = Infinity;
  let secondBestDistance = Infinity;

  for (const user of users) {
    if (!user.faceEmbedding || user.faceEmbedding.length === 0) continue;

    const storedEmbeddings = extractEmbeddings(user.faceEmbedding);
    
    let minDistanceForUser = Infinity;
    for (const stored of storedEmbeddings) {
      if (stored.length !== embedding.length) continue;
      const distance = cosineDistance(embedding, stored);
      if (distance < minDistanceForUser) {
        minDistanceForUser = distance;
      }
    }

    if (minDistanceForUser < bestDistance) {
      secondBestDistance = bestDistance;
      bestDistance = minDistanceForUser;
      bestMatch = user;
    } else if (minDistanceForUser < secondBestDistance) {
      secondBestDistance = minDistanceForUser;
    }
  }

  // Reject if best distance is above threshold
  if (!bestMatch || bestDistance >= threshold) {
    console.log(`[FaceMatch] No match found. Best distance: ${bestDistance.toFixed(4)}, threshold: ${threshold}`);
    return null;
  }

  // Reject if the match is too close to the second-best (ambiguous)
  const margin = secondBestDistance - bestDistance;
  if (secondBestDistance !== Infinity && margin < 0.05) {
    console.log(`[FaceMatch] Ambiguous match rejected. Best: ${bestDistance.toFixed(4)} (${bestMatch.name}), Second: ${secondBestDistance.toFixed(4)}, Margin: ${margin.toFixed(4)}`);
    return null;
  }

  console.log(`[FaceMatch] Matched: ${bestMatch.name} (distance: ${bestDistance.toFixed(4)}, margin: ${margin === Infinity ? 'only-candidate' : margin.toFixed(4)})`);
  return { user: bestMatch, distance: bestDistance };
};

/**
 * Check if a face embedding already belongs to another user (duplicate prevention).
 */
const checkDuplicateFace = (embedding, users, excludeUserId, threshold = 0.236) => {
  for (const user of users) {
    // Skip the user being updated
    if (user._id.toString() === excludeUserId.toString()) continue;
    if (!user.faceEmbedding || user.faceEmbedding.length === 0) continue;

    const storedEmbeddings = extractEmbeddings(user.faceEmbedding);
    
    for (const stored of storedEmbeddings) {
      if (stored.length !== embedding.length) continue;
      const distance = cosineDistance(embedding, stored);
      if (distance < threshold) {
        console.log(`[FaceDuplicate] Face matches existing user: ${user.name} (distance: ${distance.toFixed(4)})`);
        return { user, distance };
      }
    }
  }
  
  return null;
};

/**
 * Verify a face embedding against a single user's stored embeddings (1:1 verification).
 * Used during attendance check-in/check-out where the user is already authenticated.
 * Much faster than findMatchingUser since it only compares against one user.
 */
const verifyUserFace = (embedding, user, threshold = 0.236) => {
  if (!user.faceEmbedding || user.faceEmbedding.length === 0) {
    return { verified: false, distance: Infinity, reason: 'no_face_data' };
  }

  const storedEmbeddings = extractEmbeddings(user.faceEmbedding);
  let minDistance = Infinity;

  for (const stored of storedEmbeddings) {
    if (stored.length !== embedding.length) continue;
    const distance = cosineDistance(embedding, stored);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  const verified = minDistance < threshold;
  console.log(`[FaceVerify] User: ${user.name}, Distance: ${minDistance.toFixed(4)}, Threshold: ${threshold}, Verified: ${verified}`);
  return { verified, distance: minDistance };
};

module.exports = { cosineDistance, findMatchingUser, extractEmbeddings, checkDuplicateFace, verifyUserFace };
