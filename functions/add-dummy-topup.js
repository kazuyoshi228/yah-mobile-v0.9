const admin = require('firebase-admin');

// Initialize admin app without credentials if running on GCP/Firebase,
// or it will pick up GOOGLE_APPLICATION_CREDENTIALS
admin.initializeApp({
  projectId: "yah-mobile-test"
});

const db = admin.firestore();

async function main() {
  const dummyPlan = {
    bappyPlanId: "DUMMY_TOPUP_1GB_1D",
    name: "【Dummy】1GB / 1Day (Top-Up)",
    dataGb: 1,
    validityDays: 1,
    priceJpy: 300,
    planType: "topup",
    regions: "Japan",
    isActive: true,
    isPopular: false,
    sortOrder: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const docRef = await db.collection("plans").add(dummyPlan);
  console.log("Added dummy top-up plan with ID:", docRef.id);
}

main().catch(console.error);
