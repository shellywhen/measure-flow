let getNodeDuringInterval = function (dgraph, interval) {
  let nodes = new Set()
  for (let t = interval[0]; t < interval[1]; t ++) {
    dgraph.timeArrays.links[t].forEach(l => {
      nodes.add(dgraph.linkArrays.source[l])
      nodes.add(dgraph.linkArrays.target[l])
    })
  }
  return nodes
}

let getNeighborDuringInterval = function (dgraph, interval, node) {
  let nodes = []
  let neighbors = dgraph.nodeArrays.neighbors[node].serie
  for(let t = interval[0]; t < interval[1]; t ++) {
    if (t in neighbors) {
      neighbors[t].forEach(v => {
        nodes.push(v)
      })
    }
  }
  return new Set(nodes)
}

let getConnectedComponent = function (dgraph, interval) {
  let dots = []
  interval.forEach(itv => {
    let nodes = getNodeDuringInterval(dgraph, itv)
    let nodeList = Array.from(nodes)

    if (nodeList.length === 0) {
      dots.push(dataWrapper(dgraph, itv, 0))
      return
    }
    let flags = new Array(nodes.size).fill(false)
    let map = new Map()
    let component = nodeList.map((v, i) => i)
    nodeList.forEach((v, i) => {map[v] = i})
    let queue = [0]
    for (let nid in nodeList) {
      if(!flags[nid]) queue.push(nid)
      while (queue.length > 0) {
        let i = queue.pop()
        if (flags[i]==true) continue
        flags[i] = true
        let neighbors = [...getNeighborDuringInterval(dgraph, itv, nodeList[i])]
        neighbors.forEach(v => {
          if (!flags[map[v]]) {
            queue.push(map[v])
            component[map[v]] = component[i]
          }
        })
      }
    }
    let group = new Set()
    component.forEach((v, i) => {
      if (v != i) group.add(v)
    })
    dots.push(dataWrapper(dgraph, itv, group.size))
  })
  return dots
}

let getNumberOfNodes = function (dgraph, interval) {
   return interval.map(itv => {
    let nodes = getNodeDuringInterval(dgraph, itv)
    return dataWrapper(dgraph, itv, nodes.size)
  })
}

let getNumberOfLinkPairs = function (dgraph, interval) {
  let dots = []
  for (let itv of interval) {
    let linkPairs = new Set()
    for (let t = itv[0]; t < itv[1]; t ++) { // aggregation
      dgraph.timeArrays.links[t].forEach(l => {
        linkPairs.add(dgraph.linkArrays.nodePair[l])
      })
    }
    dots.push(dataWrapper(dgraph, itv, linkPairs.size))
  }
  return dots
}

let getNumberOfLinks = function (dgraph, interval) {
  let dots = []
  for (let itv of interval) {
    let sum = 0
    for (let t = itv[0]; t < itv[1]; t ++) { // aggregation
      sum += dgraph.timeArrays.links[t].length
    }
    dots.push(dataWrapper(dgraph, itv, sum))
  }
  return dots
}

let getDensity = function (dg, interval) {
  let nodeNumber = getProcessedData(dg, [interval], getNumberOfNodes)[0]
  let linkPairNumber = getProcessedData(dg, [interval], getNumberOfLinkPairs)[0]
  let dots = []
  let densityDots = nodeNumber.dots.map((nodenumber, nodeidx) => {
    let linkpair = linkPairNumber.dots[nodeidx]
    let currentPossible =  nodenumber.y * (nodenumber.y - 1) / 2
    let totalNode = dg.nodeArrays.length
    let totalPossible = totalNode * (totalNode - 1) / 2
    let value = linkpair.y / totalPossible
    value = Number.isNaN(value)? 0 : value
    return {
      'timeStart': nodenumber.timeStart,
      'timeEnd': nodenumber.timeEnd,
      'y': value
    }
  })
  return {
    dots: densityDots
  }
}

let getActivation = function (dgraph, interval) {
  let dots = []
  let linkList = dgraph.timeArrays.links
  let current = new Set ()
  interval.forEach(itv => {
    if(itv[1]<=itv[0]) {
        dots.push(dataWrapper(dgraph, itv, 0))
        return
    }
    let nodes = getNodeDuringInterval(dgraph, itv)
    nodes.forEach(n => {current.add(n)})
    dots.push(dataWrapper(dgraph, itv, current.size))
  })
  return dots
}

let getRedundancy = function (dgraph, interval) {
  let dots = [dataWrapper(dgraph, interval[0], 0)]
  let linkList = dgraph.timeArrays.links
  let previous = getNodeDuringInterval(dgraph, interval[0])
  for (let i = 1; i < interval.length; i ++) {
    let current = getNodeDuringInterval(dgraph, interval[i])
    let intersection = new Set([...current].filter(x => previous.has(x)))
    dots.push(dataWrapper(dgraph, interval[i], intersection.size))
    previous = current
  }
  return dots
}

let dataWrapper = function (dgraph, interval, y) {
  return {
    'y': y
  }
}

let getVolatility = function (dgraph, interval) {
  let linkList = dgraph.timeArrays.links
  let previous = new Set()
  for (let t = interval[0][0]; t <= interval[0][1]; t++) {
    linkList[t].forEach( l => {
      previous.add(dgraph.linkArrays.nodePair[l])
    })
  }
  let dots = [dataWrapper(dgraph, interval[0], previous.size)]
  for (let i = 1; i < interval.length; i ++) {
    let current = new Set()
    let itv = interval[i]
    for (let t = itv[0]; t < itv[1]; t ++) { // aggregation
      linkList[t].forEach(l => {
        current.add(dgraph.linkArrays.nodePair[l])
      })
    }
    let intersection = new Set([...current].filter(x => previous.has(x)))
    dots.push(dataWrapper(dgraph, itv, current.size + previous.size - intersection.size))
    previous = current
  }
  return dots
}

let getProcessedData = function (dg, intervals, action, paras=0) {
  return intervals.map((v, i) => {
    let result = action(dg, v.period.map(m => m.interval), paras)
    result.forEach((m, j) => {
      m.timeStart = v.period[j].x0
      m.timeEnd = v.period[j].x1
    })
    return {
      'granularity': v.granularity,
      'dots': result,
      'milisecond': v.milisecond
    }
  })
}
let getSingleLinkStat = function (dgraph, interval, name) {
  let result = []
  for (let itv of interval) {
    let sum = 0
    for (let t = itv[0]; t < itv[1]; t ++) { // aggregation
      dgraph.timeArrays.links[t].forEach(lid => {
        let linkType = dgraph.linkArrays.linkType[lid]
        if (linkType === name)
         sum += d3.sum(Object.values(dgraph.linkArrays.weights[lid].serie))
      })
    }
      result.push(dataWrapper(dgraph, itv, sum))
  }
  return result
}

let getSingleNodeStat = function (dgraph, interval, name) {
  let result = []
  for (let itv of interval) {
    let nodes = new Set()
    for (let t = itv[0]; t < itv[1]; t ++) { // aggregation
      let links = dgraph.timeArrays.links[t]
      for(let lid of links) {
        let src = dgraph.linkArrays.source[lid]
        let dst = dgraph.linkArrays.target[lid]
        if (dgraph.nodeArrays.nodeType[src] === type) nodes.add(src)
        if (dgraph.nodeArrays.nodeType[dst] === type) nodes.add(dst)
      }
    }
    result.push(dataWrapper(dgraph, itv, nodes.size))
  }
  return result
}
export let getSingleData = function (dg, interval, content) {
  switch (content) {
    case 'nodeNumber': return getProcessedData(dg, [interval], getNumberOfNodes)[0]
    case 'linkPairNumber': return getProcessedData(dg, [interval], getNumberOfLinkPairs)[0]
    case 'linkNumber': return getProcessedData(dg, [interval], getNumberOfLinks)[0]
    case 'density': {
      let value = getDensity(dg, interval)
      return value
    }
    case 'activation': return getProcessedData(dg, [interval], getActivation)[0]
    case 'redundancy': return getProcessedData(dg, [interval], getRedundancy)[0]
    case 'volatility': return getProcessedData(dg, [interval], getVolatility)[0]
    case 'component': return getProcessedData(dg, [interval], getConnectedComponent)[0]
    default:
      console.log('oops')
      break
  }
  let type = content.substring(0, 4)
  let name = content.substring(9, content.length)
  if (type === 'link') return getProcessedData(dg, [interval], getSingleLinkStat, name)[0]
  if (type === 'node') return getProcessedData(dg, [interval], getSingleNodeStat, name)[0]
  console.log(type, name, getProcessedData(dg, [interval], getSingleLinkStat, name)[0])
}
