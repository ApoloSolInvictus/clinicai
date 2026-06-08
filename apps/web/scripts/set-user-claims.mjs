import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [email, clinicIdsRaw = "clinic-san-jose", role = "clinic-admin"] = process.argv.slice(2);

if (!email) {
  console.error("Uso: npm run firebase:claims --workspace apps/web -- usuario@clinica.com clinic-san-jose clinic-admin");
  process.exit(1);
}

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error("Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    })
  });
}

const clinicIds = clinicIdsRaw
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const allClinics = role === "platform-admin" || role === "super-admin";
const user = await getAuth().getUserByEmail(email);

await getAuth().setCustomUserClaims(user.uid, {
  role,
  clinicIds,
  allClinics
});

console.log(
  JSON.stringify(
    {
      uid: user.uid,
      email,
      role,
      clinicIds,
      allClinics
    },
    null,
    2
  )
);
