export let description = {
  nodeNumber: 'The number of nodes having connections to others.',
  linkNumber:'The number of active links.',
  linkPairNumber: 'The number of active link pairs (dropped duplicates).',
  density: 'The ratio of the number of active node pairs and the number of possible node pairs (every node counts).',
  activation: 'The number of activated nodes from the beginning till current period, which at least connects to others once.',
  redundancy: 'The number of the overlapped nodes between the previous period and current period.',
  volatility: 'The number of changing link pairs between the previous period and current period.',
  component: 'The number of connected components.'
}

export let title = {
  nodeNumber: 'Connected Nodes',
  linkNumber:'Active Links',
  linkPairNumber: 'Active Link Pairs',
  density: 'Density',
  activation: 'Activation',
  redundancy: 'Redundancy',
  volatility: 'Volatility',
  component: 'Connected Components'
}
