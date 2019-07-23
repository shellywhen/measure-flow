export let handleSelect = function (nodeId) {
  if (window.dgraph.nodeSelection.has(nodeId)) deleteNode(nodeId)
  else addNode(nodeId)
}

let deleteNode = function (nodeId) {
  window.dgraph.nodeSelection.delete(nodeId)
  updateSelectionList()
}

let addNode = function (nodeId) {
  window.dgraph.nodeSelection.add(nodeId)
  updateSelectionList()
}

let updateSelectionList = function () {
  let dg = window.dgraph
  let idList =  Array.from(dg.nodeSelection)
  let text = ''
  for (let i = 0; i < idList.length - 1; i ++) {
    text += dg.nodeArrays.label[idList[i]] + ', '
  }
  text += dg.nodeArrays.label[idList[idList.length - 1]]
  d3.select('#selectedNodeList')
    .style('font-size', '0.8rem')
    .text(`Selected Nodes: ${text}`)
}
