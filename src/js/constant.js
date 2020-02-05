export let description = {
  nodeNumber: 'The number of nodes having connections to others.',
  linkNumber:'The number of active links.',
  linkPairNumber: 'The number of active link pairs (dropped duplicates).',
  density: 'The ratio of the number of active node pairs and the number of possible node pairs (every node counts).',
  activation: 'The number of activated nodes from the beginning till current period, which at least connects to others once.',
  redundancy: 'The number of the overlapped nodes between the previous period and current period.',
  coming: 'The number of new links compared with the previous period.',
  leaving: 'The number of disappeared links compared with the previous period.',
  volatility: 'The number of changing link pairs between the previous period and current period.',
  component: 'The number of connected components.',
  coeff: '3 * closed triangle / open triangles ',
  triangle: 'The number of triangles.'
}

export let title = {
  nodeNumber: 'Connected Nodes',
  linkNumber:'Active Links',
  linkPairNumber: 'Active Link Pairs',
  density: 'Density',
  activation: 'Activation',
  redundancy: 'Redundancy',
  coming: 'New Link Pairs',
  leaving: 'Leaving Link Pairs',
  volatility: 'Moving Link Pairs',
  component: 'Connected Components',
  coeff: 'Clustering Coefficient',
  triangle: 'Triangles'
}

export let SCHEMA = {
  'Scientists':{
    source: 0,
    target: 3,
    weight: 6,
    time: 5,
    linkType: 2
  },
 'Diplomatic Exchange': {
    source: 7,
    target: 8,
    weight: 5,
    time: 2,
    linkType: 3,
  },
'Merchant': {
    source: 0,
    target: 3,
    time: 9,
    linkType: 2
  },
'Marie-Colombu': {
    source: 1,
    target: 6,
    time: 14,
    linkType: 5
  },
'Rolla-Cristofoli': {
    time: 0,
    linkType: 1,
    source: 4,
    target: 5
  },
'Marguerite': {
    time: 0,
    source: 4,
    target: 5,
    linkType: 1
  },
'Highschool': {
    source: 1,
    target: 2,
    time: 5,
    id: 6
  },
'Highschool_2011': {
    source: 1,
    target: 2,
    time: 5,
    id: 6
  },
'Highschool_2012': {
    source: 1,
    target: 2,
    time: 5,
    id: 6
  },
'Contract': {
    source: 0,
    target: 1,
    time: 4,
    linkType: 10
  },
'Twitter': {
    source: 2,
    target: 3,
    time: 6
  },
'Embryo': {
    source: 0,
    target: 1,
    time: 3
  },
 'Gene':{
   source: 0,
   target: 1,
   time: 2,
   id: 3
 }
}

export let TIME_FORMAT = {
  'Scientists': 'DD/MM/YYYY',
  'Diplomatic Exchange': 'YYYY',
  'Merchant': 'DD/MM/YYYY',
  'Marie-Colombu':'DD/MM/YYYY',
  'Rolla-Cristofoli': 'YYYYMMDD',
  'Marguerite': 'DD-MM-YYYY',
  'Highschool': 'MM/DD/YYYY HH:mm',
  'Highschool_2012': 'MM/DD/YYYY HH:mm',
  'Highschool_2011': 'MM/DD/YYYY HH:mm',
  'Contract': 'YYYYMMDD',
  'Twitter': 'YYYY-MM-DD HH:mm',
  'Embryo': 'YYYY-MM-DD HH',
  'Gene': 'MM/DD/YYYY HH:mm:ss'
}
