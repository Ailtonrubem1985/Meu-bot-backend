const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const availableExchanges = {
    binance: { fee: 0.001, spotApi: 'https://api.binance.com/api/v3/ticker/price' },
    mexc: { fee: 0.001, spotApi: 'https://api.mexc.com/api/v3/ticker/price' },
    bitget: { fee: 0.001, spotApi: 'https://api.bitget.com/api/v2/spot/market/tickers' },
    kucoin: { fee: 0.001, spotApi: 'https://api.kucoin.com/api/v1/market/allTickers' },
    bybit: { fee: 0.001, spotApi: 'https://api.bybit.com/v5/market/tickers?category=spot' },
    okx: { fee: 0.001, spotApi: 'https://www.okx.com/api/v5/market/tickers?instType=SPOT' }
};

const allPairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'ETHBTC', 'SOLBTC'];

app.get('/api/market-data', async (req, res) => {
    console.log(`[${new Date().toLocaleTimeString()}] Recebido pedido de dados de mercado.`);
    const marketData = {};

    const promises = Object.keys(availableExchanges).map(async (exName) => {
        const exConfig = availableExchanges[exName];
        try {
            const response = await fetch(exConfig.spotApi, { timeout: 5000 });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            let prices = [];
            if (exName === 'binance' || exName === 'mexc') prices = data;
            else if (exName === 'bitget') prices = data.data;
            else if (exName === 'kucoin') prices = data.data.ticker;
            else if (exName === 'bybit') prices = data.result.list;
            else if (exName === 'okx') prices = data.data;

            marketData[exName] = {};
            prices.forEach(p => {
                const symbol = (p.symbol || p.instId || '').replace('-', '');
                const price = parseFloat(p.price || p.last || p.lastPrice || p.lastPx);
                if (allPairs.includes(symbol) && !isNaN(price)) {
                    marketData[exName][symbol] = {
                        ask: price * 1.0001,
                        bid: price * 0.9999
                    };
                }
            });
             console.log(`[${new Date().toLocaleTimeString()}] Dados de ${exName} obtidos com sucesso.`);
        } catch (error) {
            console.error(`[${new Date().toLocaleTimeString()}] Erro ao buscar dados de ${exName}: ${error.message}`);
        }
    });

    await Promise.allSettled(promises);
    console.log(`[${new Date().toLocaleTimeString()}] Enviando dados agregados para o cliente.`);
    res.json(marketData);
});

app.get('/', (req, res) => {
    res.send('Servidor do Bot de Arbitragem está online!');
});

app.listen(PORT, () => {
    console.log(`Servidor do Bot de Arbitragem a funcionar na porta ${PORT}`);
});
