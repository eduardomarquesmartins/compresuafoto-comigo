const axios = require('axios');

const baseURL = 'http://localhost:3002/api';

async function testProposals() {
    try {
        console.log('Testing Proposal Creation...');
        const createRes = await axios.post(`${baseURL}/proposals`, {
            clientName: 'Test Client',
            clientEmail: 'test@example.com',
            selectedServices: [{ name: 'Test Service', price: 100 }],
            total: 100
        });
        const proposalId = createRes.data.id;
        console.log('Proposal Created:', proposalId);

        console.log('Testing Proposal List...');
        const listRes = await axios.get(`${baseURL}/proposals`);
        const found = listRes.data.find(p => p.id === proposalId);
        if (found) console.log('Proposal found in list.');

        console.log('Testing Proposal Approval...');
        await axios.patch(`${baseURL}/proposals/${proposalId}/approve`);
        console.log('Proposal Approved.');

        console.log('Testing Dashboard Stats...');
        const statsRes = await axios.get(`${baseURL}/dashboard/stats`);
        console.log('Dashboard Stats (Revenue):', statsRes.data.revenue);

        console.log('Testing Proposal Deletion...');
        await axios.delete(`${baseURL}/proposals/${proposalId}`);
        console.log('Proposal Deleted.');

        console.log('Verification Complete!');
    } catch (err) {
        console.error('Verification Failed:', err.response?.data || err.message);
    }
}

testProposals();
