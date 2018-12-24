const data = [
    {
        itemhistid: 1,
        time: new Date('2018-12-24T00:00:00Z'),
        count: 101,
        itemid: 1750,
        userid: 1,
        actionid: 5,
        priceid1: 822,
        priceid2: null
    },
    {
        itemhistid: 2,
        time: new Date('2018-12-24T00:00:01Z'),
        count: 100,
        itemid: 1800,
        userid: 1,
        actionid: 5,
        priceid1: 877,
        priceid2: null
    },
    // admin changed sellprice
    {
        itemhistid: 3,
        time: new Date('2018-12-24T00:00:02Z'),
        count: 100,
        itemid: 1800,
        userid: 2,
        actionid: 7,
        priceid1: 877,
        priceid2: 899
    },
    {
        itemhistid: 4,
        time: new Date('2018-12-24T00:00:05Z'),
        count: 101,
        itemid: 1756,
        userid: 1,
        actionid: 5,
        priceid1: 827,
        priceid2: null
    },
    // two different products bought at the same time
    {
        itemhistid: 5,
        time: new Date('2018-12-24T00:00:10Z'),
        count: 100,
        itemid: 1756,
        userid: 1,
        actionid: 5,
        priceid1: 827,
        priceid2: null
    },
    {
        itemhistid: 6,
        time: new Date('2018-12-24T00:00:10Z'),
        count: 100,
        itemid: 1750,
        userid: 1,
        actionid: 5,
        priceid1: 822,
        priceid2: null
    },
    // two same products bought at the same time
    {
        itemhistid: 7,
        time: new Date('2018-12-24T00:00:15Z'),
        count: 101,
        itemid: 1772,
        userid: 1,
        actionid: 5,
        priceid1: 847,
        priceid2: null
    },
    {
        itemhistid: 8,
        time: new Date('2018-12-24T00:00:15Z'),
        count: 100,
        itemid: 1772,
        userid: 1,
        actionid: 5,
        priceid1: 847,
        priceid2: null
    }
];

module.exports = data;
