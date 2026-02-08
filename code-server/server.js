// server.js - Node.js后端服务器
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// 模拟数据库存储兑换码信息
let vouchers = new Map();

// 生成兑换码函数
function generateVoucher(maxUses = 3) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // 24小时后过期
    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    vouchers.set(code, {
        maxUses: maxUses,
        currentUses: 0,
        expiryDate: expiryDate,
        createdAt: new Date()
    });
    
    return code;
}

// 生成一批兑换码
function generateBatchVouchers(count = 100, maxUses = 3) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        codes.push(generateVoucher(maxUses));
    }
    return codes;
}

// 清理过期兑换码的定时任务
setInterval(() => {
    const now = new Date();
    for (let [code, data] of vouchers) {
        if (now > data.expiryDate) {
            vouchers.delete(code);
            console.log(`兑换码 ${code} 已过期并被删除`);
        }
    }
}, 60000); // 每分钟清理一次

// API路由

// 生成兑换码（仅用于演示，实际部署时应有权限控制）
app.get('/api/generate-voucher', (req, res) => {
    const count = parseInt(req.query.count) || 1;
    const maxUses = parseInt(req.query.uses) || 3;
    const codes = [];
    
    for (let i = 0; i < count; i++) {
        codes.push(generateVoucher(maxUses));
    }
    
    res.json({ 
        success: true, 
        codes: codes,
        message: `成功生成 ${count} 个兑换码，每个可使用 ${maxUses} 次，24小时内有效`
    });
});

// 验证兑换码
app.post('/api/verify-voucher', (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        return res.status(400).json({ 
            success: false, 
            message: '请输入兑换码' 
        });
    }
    
    const voucher = vouchers.get(code);
    
    if (!voucher) {
        return res.status(404).json({ 
            success: false, 
            message: '兑换码不存在' 
        });
    }
    
    const now = new Date();
    if (now > voucher.expiryDate) {
        return res.status(400).json({ 
            success: false, 
            message: '兑换码已过期' 
        });
    }
    
    if (voucher.currentUses >= voucher.maxUses) {
        return res.status(400).json({ 
            success: false, 
            message: '兑换码使用次数已达上限' 
        });
    }
    
    // 增加使用次数
    voucher.currentUses += 1;
    
    res.json({ 
        success: true, 
        message: '验证成功',
        remainingUses: voucher.maxUses - voucher.currentUses,
        expiresAt: voucher.expiryDate
    });
});

// 获取兑换码状态（用于调试）
app.get('/api/voucher-status/:code', (req, res) => {
    const code = req.params.code;
    const voucher = vouchers.get(code);
    
    if (!voucher) {
        return res.status(404).json({ 
            success: false, 
            message: '兑换码不存在' 
        });
    }
    
    const now = new Date();
    const expired = now > voucher.expiryDate;
    
    res.json({
        success: true,
        code: code,
        expired: expired,
        expiryDate: voucher.expiryDate,
        currentUses: voucher.currentUses,
        maxUses: voucher.maxUses,
        remainingUses: expired ? 0 : voucher.maxUses - voucher.currentUses
    });
});

// 主页 - 返回修改后的HTML页面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`生成示例兑换码: ${generateVoucher()}`);
});

module.exports = app;