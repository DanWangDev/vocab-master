// Native fetch is available in Node 18+

const API_URL = 'http://localhost:9876/api';

async function verifyAddUser() {
    try {
        // 1. Login as Admin
        console.log('Logging in as BigDaddy...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'BigDaddy', password: 'BigDaddy' })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
        }

        const authData: any = await loginRes.json();
        const token = authData.tokens.accessToken;
        console.log('Login successful. Token acquired.');

        // 2. Create New User
        const newUsername = `TestUser_${Date.now()}`;
        console.log(`Creating user: ${newUsername}...`);

        const createRes = await fetch(`${API_URL}/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                username: newUsername,
                password: 'password123',
                role: 'student',
                parentId: null
            })
        });

        if (!createRes.ok) {
            const err: any = await createRes.json();
            throw new Error(`Create user failed: ${createRes.status} - ${err.error || 'Unknown error'}`);
        }

        const createData: any = await createRes.json();
        console.log('Create user response:', createData);

        if (createData.success) {
            console.log('✅ VERIFICATION PASSED: User created successfully.');
        } else {
            console.error('❌ VERIFICATION FAILED: Success flag missing.');
        }

    } catch (error) {
        console.error('❌ VERIFICATION FAILED:', error);
        process.exit(1);
    }
}

verifyAddUser();
