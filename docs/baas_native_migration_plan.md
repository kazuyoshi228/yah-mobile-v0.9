# Architectural Blueprint: Pure BaaS-Native Migration Plan (Google Supervisor Level)

This document outlines the architectural specification and implementation steps to refactor `yah-mobile-v3` into a **pure BaaS-native, Firestore-driven linear architecture**. All traditional API wrappers (Callable Cloud Functions) are removed, leaving a direct, reactive loop between the frontend and database.

---

## 1. Architectural Philosophy

The system will transition from a traditional Client-Server API model to an **Event-Driven Reactive Database** model:

```
[ React Client ] <======( Direct Firestore SDK )======> [ Firestore Database ]
                                                              ▲
                                                              │ (Reactive Triggers)
                                                              ▼
                                                   [ Cloud Function Triggers ]
                                                              │
                                                              ▼ (External APIs)
                                                     [ Stripe / Bappy eSIM ]
```

### Key Principles:
1. **Single Source of Truth (SSOT)**: The database (Firestore) is the only interface the client interacts with. No custom REST or Callable APIs.
2. **Declarative Security**: Access control and schema validation are completely defined inside `firestore.rules`.
3. **Asynchronous Side Effects**: Integrations requiring secret keys (Stripe payments, eSIM provisioning) are handled reactively by backend Firestore Triggers (`onCreate`, `onUpdate`).

---

## 2. Step-by-Step Migration Plan

### Step 1: Rewrite Database Security Rules (`firestore.rules`)
Enforce strict security and schema validation inside `firestore.rules` to prevent malicious writes.

* **Target File**: `firestore.rules`
* **Implementation Specification**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    function isAdmin() {
      return isAuthenticated() && request.auth.token.admin == true;
    }

    // 1. Users Collection
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create, update: if isOwner(userId) 
        && (!request.resource.data.keys().hasAny(['role'])) // Users cannot change their own role
        && (request.resource.data.status == 'active' || !request.resource.data.keys().hasAny(['status']));
      allow delete: if false;
    }

    // 2. Orders Collection (Reactive Checkout Creation)
    match /orders/{orderId} {
      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      // Users can only create pending orders for themselves
      allow create: if isAuthenticated() 
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.status == "pending"
        && (!request.resource.data.keys().hasAny(['stripeSessionId', 'checkoutUrl']));
      // Regular users cannot update orders directly (updates are done by Cloud Functions / Admin SDK)
      allow update: if isAdmin();
      allow delete: if false;
    }

    // 3. eSIM Links Collection
    match /esim_links/{linkId} {
      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      // Users can update syncRequestedAt to trigger data sync, but no other fields
      allow update: if isAuthenticated() 
        && resource.data.userId == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['syncRequestedAt']);
      allow create, delete: if false; // Provisioned purely by Cloud Functions
    }

    // 4. Contact Inquiries
    match /contact_inquiries/{inquiryId} {
      allow create: if true; // Public submission
      allow read, update, delete: if isAdmin();
    }
  }
}
```

---

### Step 2: Implement Reactive Cloud Function Triggers
Replace the API endpoints with background triggers that listen to database updates.

* **Target Path**: `functions/src/triggers/`

#### A. Trigger 1: `onOrderCreated` (Reactive Stripe Checkout)
* **Trigger Event**: `onDocumentCreated` on `/orders/{orderId}`
* **Logic**:
  1. Read the newly created order from Firestore.
  2. Call Stripe API to create a Checkout Session (`stripe.checkout.sessions.create`).
  3. Write the generated `stripeSessionId` and `checkoutUrl` directly back to the `/orders/{orderId}` document.

#### B. Trigger 2: `onEsimSyncRequested` (Reactive eSIM Data Sync)
* **Trigger Event**: `onDocumentUpdated` on `/esim_links/{linkId}`
* **Logic**:
  1. Trigger fires when `syncRequestedAt` timestamp is updated by the client.
  2. Call Bappy eSIM API to fetch current data usage.
  3. Update `/esim_links/{linkId}` with the latest `dataUsed`, `dataRemaining`, and `status`.

---

### Step 3: Refactor Frontend Authentication
Eliminate custom registration endpoints. Perform onboarding directly via the client SDK.

* **Target File**: `client/src/_core/hooks/useAuth.ts`
* **Refactoring Specification**:
  1. On Google Login success, the client directly writes (or updates) the user document in Firestore:
     ```typescript
     import { doc, setDoc } from "firebase/firestore";
     
     // Inside sign-in callback:
     const userDocRef = doc(getFirebaseDb(), "users", fbUser.uid);
     await setDoc(userDocRef, {
       uid: fbUser.uid,
       name: fbUser.displayName,
       email: fbUser.email,
       loginMethod: "google",
       lastSignedIn: Date.now(),
       updatedAt: Date.now()
     }, { merge: true });
     ```
  2. Listen to admin claims reactively via `fbUser.getIdTokenResult()` and map to `user.role`.

---

### Step 4: Refactor Checkout Flow (Reactive UX)
Remove `ordersInitCheckout` API calls. Replace with direct Firestore document creation and observation.

* **Target File**: `client/src/components/app/PurchaseDrawer.tsx`
* **Refactoring Specification**:
  1. Create the order directly:
     ```typescript
     import { collection, addDoc } from "firebase/firestore";
     
     const orderRef = await addDoc(collection(db, "orders"), {
       userId: user.uid,
       planId: plan.id,
       planName: plan.name,
       amountJpy: plan.priceJpy,
       status: "pending",
       createdAt: Date.now()
     });
     ```
  2. Subscribe to the order document:
     ```typescript
     import { doc, onSnapshot } from "firebase/firestore";
     
     const unsub = onSnapshot(doc(db, "orders", orderRef.id), (docSnap) => {
       const orderData = docSnap.data();
       if (orderData?.checkoutUrl) {
         unsub();
         window.location.href = orderData.checkoutUrl; // Redirect to Stripe checkout
       }
     });
     ```

---

### Step 5: Clean Up and Delete Unused Code
Completely delete legacy files to enforce code cleanliness and eliminate security surface area.

* **Delete Legacy Files**:
  * `client/src/lib/callable.ts` (API Client helper)
  * `functions/src/callables/` (All files inside: `auth.ts`, `user.ts`, `orders.ts`, `esim.ts`, `contact.ts`)
  * `shared/callableSchemas.ts` (Zod schemas for callable functions)

---

## 3. Verification & Validation Plan
1. **Security Verification**: Try modifying `/orders` directly from the browser console to set `status: "paid"`. Confirm Firestore blocks the write.
2. **Checkout Integration**: Create an order, confirm `checkoutUrl` is updated within ~1 second, and verify the client redirects smoothly to Stripe.
3. **eSIM Provisioning**: complete mock Stripe payment, verify webhook updates order to `paid`, trigger `onOrderPaid` trigger, and ensure QR code is displayed on frontend without page reload.
