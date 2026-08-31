const User = require('../models/User');
const axios = require('axios');

exports.connectMeta = async (req, res) => {
  try {
    const { accessToken, accountId } = req.body;
    
    if (!accessToken || !accountId) {
      return res.status(400).json({ success: false, error: 'Please provide access token and account ID' });
    }

    // Verify token with Meta Graph API
    const verifyUrl = `https://graph.facebook.com/v21.0/me?access_token=${accessToken}`;
    const metaResponse = await axios.get(verifyUrl);

    if (metaResponse.data && metaResponse.data.id) {
      // Update User
      const user = await User.findByIdAndUpdate(req.user.id, {
        metaAccessToken: accessToken,
        metaAccountId: accountId
      }, { new: true });

      res.status(200).json({ success: true, data: user });
    } else {
      res.status(401).json({ success: false, error: 'Invalid Meta access token' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.response?.data?.error?.message || error.message });
  }
};
