/**
 * ShowLyrics - Local Admin Logic
 *
 * This file handles:
 * - Real-time fetching of pending transactions.
 * - AES-256 encrypted license generation.
 * - Firestore batch updates for manual order approval.
 * 
 * SECURITY: Restricted to admin email adminjoseph@showlyrics.app 
 * and specific Admin UID defined in firestore.rules.
 */

(function () {
    'use strict';

    const { db, auth } = window.__SL;
    const SECRET_KEY = 'ShowLyrics_Prod_2026_Secure'; // MUST MATCH DASHBOARD

    const $ = id => document.getElementById(id);

    /**
     * Renders the list of pending transactions
     */
    const renderList = (snapshot) => {
        const list = $('pending-list');
        if (!list) return;

        if (snapshot.empty) {
            list.innerHTML = '<div class="empty">No pending transactions found. ✅</div>';
            return;
        }

        list.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="details">
                    <span class="order-id">${data.order_id}</span>
                    <span>User: <strong>${data.name}</strong> (${data.email})</span>
                    <span>Plan: ${data.plan} (${data.period})</span>
                    <span>Amount: Rp ${data.amount.toLocaleString()}</span>
                    <span>Date: ${data.created_at ? new Date(data.created_at).toLocaleString() : 'N/A'}</span>
                </div>
                <div>
                    <button class="btn btn-approve" data-approve-id="${doc.id}">APPROVE</button>
                </div>
            `;
            list.appendChild(card);
        });

        // Add event listeners to buttons
        list.querySelectorAll('[data-approve-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-approve-id');
                approveOrder(id);
            });
        });
    };

    /**
     * Generates a 13-character random alphanumeric key
     */
    const generateKey = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
        let res = '';
        for (let i = 0; i < 13; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
        return res;
    };

    /**
     * Encrypts the license key with AES-256
     */
    const encryptKey = (text) => {
        return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
    };

    /**
     * Main approval workflow
     */
    const approveOrder = async (id) => {
        if (!confirm(`Approve transaction ${id}? This will generate the required encrypted licenses and mark the order as PAID.`)) return;

        try {
            const doc = await db.collection('transactions').doc(id).get();
            if (!doc.exists) throw new Error("Transaction not found.");

            const data = doc.data();
            const batch = db.batch();
            const expiry = new Date();
            expiry.setMonth(expiry.getMonth() + (data.period === 'annual' ? 12 : 1));
            const expiryStr = expiry.toISOString().split('T')[0];

            // Map plan identifiers to counts and labels
            const PLAN_MAP = {
                individual: { count: 1,  label: 'Pro Individual' },
                mini:       { count: 10, label: 'Mini Campus' },
                standard:   { count: 20, label: 'Standard Campus' },
                large:      { count: 30, label: 'Large Campus' }
            };

            const planInfo = PLAN_MAP[data.plan] || PLAN_MAP.individual;
            const generatedKeys = [];

            for (let i = 0; i < planInfo.count; i++) {
                const rawKey = generateKey();
                const encryptedKey = encryptKey(rawKey);
                generatedKeys.push(rawKey);

                const licRef = db.collection('licenses').doc(rawKey);
                batch.set(licRef, {
                    key: encryptedKey,
                    ownerEmail: data.email,
                    ownerUid: data.uid,
                    planType: planInfo.label,
                    pluginVersion: i + 1, // Optional: tracking seat number
                    isActive: true,
                    expiryDate: expiryStr,
                    hwid: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // 2. Mark Transaction as Success
            batch.update(db.collection('transactions').doc(id), {
                status: 'success',
                approved_at: Date.now()
            });

            // 3. Update User profile with the PRIMARY active license (the first one)
            const userRef = db.collection('users').doc(data.uid);
            batch.update(userRef, {
                active_license_id: generatedKeys[0],
                active_license_expires: expiryStr
            });

            await batch.commit();
            alert(`✅ Order Approved Successfully!\n\nGenerated ${planInfo.count} license keys for ${planInfo.label}.\nFirst Key: ${generatedKeys[0]}`);
        } catch (err) {
            console.error("Approval Error:", err);
            alert("Error: " + err.message);
        }
    };

    /**
     * Initialize Auth Listener
     */
    const init = () => {
        auth.onAuthStateChanged(user => {
            const statusEl = $('admin-status');
            if (!statusEl) return;

            if (!user) {
                statusEl.innerHTML = `
                    <span style="color:var(--accent)">🔴 Not Logged In.</span>
                    <button class="btn btn-approve" id="admin-login-trigger" style="margin-left:10px; padding: 5px 12px; font-size: 0.8rem;">Login as Admin</button>
                    <p style="font-size: 0.75rem; margin-top: 5px; opacity: 0.7;">Make sure you use the registered admin account.</p>
                `;
                
                $('admin-login-trigger')?.addEventListener('click', async () => {
                    const email = prompt("Admin Email:", "adminjoseph@showlyrics.app");
                    const password = prompt("Admin Password:");
                    if (email && password) {
                        try {
                            statusEl.innerHTML = "Authenticating...";
                            await auth.signInWithEmailAndPassword(email, password);
                        } catch (e) {
                            alert("Login failed: " + e.message);
                            init(); // Reset
                        }
                    }
                });
                return;
            }

            // Verify admin email for safety
            if (user.email !== 'adminjoseph@showlyrics.app' && user.uid !== '7fzLhLePVOVGiygAVx7v0I1lduk1') {
                statusEl.innerHTML = `<span style="color:var(--accent)">🚫 UNAUTHORIZED ACCOUNT: ${user.email}</span>`;
                return;
            }

            statusEl.innerHTML = `🟢 Logged in as: <strong>${user.email}</strong> (Admin Recognized)`;

            // Real-time listener for pending transactions
            db.collection('transactions')
                .where('status', '==', 'pending')
                .orderBy('created_at', 'desc')
                .onSnapshot(renderList, err => {
                    console.error("Sync Error:", err);
                    const listEl = $('pending-list');
                    if (listEl) {
                        listEl.innerHTML = `<div class="empty" style="color:var(--accent)">
                            Authentication or Index Error: ${err.message}<br>
                            <small>Check firestore.indexes.json and firestore.rules</small>
                        </div>`;
                    }
                });
        });
    };

    // Run when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
