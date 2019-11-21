const DATA_TABLE_MAX_LENGTH = 100
const NODE_SCHEMA_LIST = ['(None)', 'ID', 'Label', 'Node Type', 'Group']
const LINK_SCHEMA_LIST = ['(None)', 'ID', 'Time', 'Source Node', 'Target Node', 'Weight', 'Link Type']
const SCHEMA_DICT = {
  'ID': 'id',
  'Label': 'label',
  'Node Type': 'nodeType',
  '(None)': 'nonsense',
  'Time': 'time',
  'Target Node': 'target',
  'Source Node': 'source',
  'Weight': 'weight',
  'Link Type': 'linkType',
  'Group': 'group'
}
let context = {
  'nodeTable': null,
  'nodeSchema': null,
  'linkTable': null,
  'linkSchema': null
}

let getSchema = function (divId, type) {
  let config = {}
  d3.select(`#${divId}`)
    .select('.schemaRow')
    .selectAll('th')
    .each(function(d, i) {
      let self = d3.select(this)
      let index = self.attr('column-index')
      let value = self.select('select').property('value')
      config[SCHEMA_DICT[value]] = Number(index)
    })
  if (type === 'link') {
    let schema = Object.keys(config)
    if((!'source' in schema)||(!'target' in schema)||('time' in schema)) alert('Invalid Link Schema!')
  }
  return config
}

let dealSingleLinkTable = function () {
  let source = new Set(context.linkTable.map(v => v[context.linkSchema.source]))
  let target = new Set(context.linkTable.map(v => v[context.linkSchema.target]))
  let names = Array.from(new Set([...source, ...target]))
  context.nodeTable = names.map((v, i) => [i, v])
  let lookupdict = {}
  context.nodeTable.forEach(l => lookupdict[l[1]] = l[0])
  let currentLinkTable = context.linkTable.map((row, id) => {
    let src = row[context.linkSchema.source]
    let dst = row[context.linkSchema.target]
    let time = row[context.linkSchema.time]
    let res = [id, Number(lookupdict[src]), Number(lookupdict[dst]), time]
    if ('linkType' in context.linkSchema) {
      res.push(row[context.linkSchema.linkType])
    }
    return res
  })
  context.linkTable = currentLinkTable
  context.linkSchema.id = 0
  context.linkSchema.source = 1
  context.linkSchema.target = 2
  context.linkSchema.time = 3
  if ('linkType' in context.linkSchema) context.linkSchema.linkType = 4
  context.nodeSchema = {
    'id': 0,
    'label': 1
  }
}

let dealGroupInNodeTable = function (dgraph) {
  let id_index = context.nodeSchema.id
  let group_index = context.nodeSchema.group
  dgraph.nodeArrays.group = new Array(context.nodeTable.length)
  context.nodeTable.forEach((row, i) => {
    dgraph.nodeArrays.group[i] = row[group_index]
  })
  let groups = Array.from(new Set(dgraph.nodeArrays.group))
  groups.forEach(function(name, name_idx) {
    let subgraph = new Set()
    context.nodeTable.forEach((row, i) => {
     if (row[group_index] === name) {
       subgraph.add(i)
     }
    })
    networkcube.sendMessage('subgraph', {
     'selection': subgraph,
     'flag': false
    })
  })
  window.resetInterval()
}
let updateSchema = function () {
  context.linkSchema = getSchema('linkTableDiv', 'link')
  let timeFormat = d3.select('#timeFormatInput').property('value')
  context['timeFormat'] = timeFormat
  if (context.nodeTable!=null){
    context.nodeSchema = getSchema('nodeTableDiv', 'node')
  }
  else  dealSingleLinkTable()
}
function updateNetwork () {
  if (!context.linkTable) {
    alert('There is no valid link table, please upload one.')
    return
  }
  updateSchema()
  let dataset = new networkcube.DataSet(context)
  dataset.nodeSchema = context.nodeSchema
  dataset.timeFormat = context.timeFormat
  let prevDatasetName = networkcube.getUrlVars()['datasetName'].replace(/___/g, ' ')
  window.history.pushState({},"", `${domain}?session=${session}&datasetName=${context.name}`)
  $('#dataConfigButton').click()
  networkcube.deleteData(prevDatasetName)
  networkcube.importData(session, dataset)
  window.dgraph = networkcube.getDynamicGraph()
  afterData()
  if ('group' in context.nodeSchema) {
   dealGroupInNodeTable(window.dgraph)
  }
}
let setTable = function (data, divId, type) {
  let div = d3.select(`#${divId}`)
  let title = data.shift()
  let schema
  if (data.length > DATA_TABLE_MAX_LENGTH) {
        let info = `Table shows first ${DATA_TABLE_MAX_LENGTH} rows out of ${data.length} rows in total.`
        div.append('p').text(info)
  }
  if (type==="link") {
    schema = LINK_SCHEMA_LIST
    context.linkTable = data
  }
  else if (type==="node") {
    schema = NODE_SCHEMA_LIST
    context.nodeTable = data
  }
  let table = div.append('table')
    .attr('id', `table-${divId}`)
    .classed('table table-striped table-bordered table-hover w-auto', true)
    .attr('cellspacing', 0)
  let thead = table.append('thead')
  thead.append('tr')
    .selectAll('th')
    .data(title)
    .enter()
    .append('th')
    .classed('th-sm p-2', true)
    .attr('contenteditable', false)
    .attr('scope', 'col')
    .style('font-weight', 'bold')
    .text(d => d)
  let tbody = table.append('tbody')
  for (let i = 0; i < Math.min(DATA_TABLE_MAX_LENGTH, data.length); i++) {
    datum = data[i]
    tbody.append('tr')
      .selectAll('td')
      .data(datum)
      .enter()
      .append('td')
      .classed('p-1', true)
      .attr('contenteditable', true)
      .text(d => d)
  }
$(`#table-${divId}`).DataTable({
  'pagingType': 'numbers',
  'pageLength': 5,
  'searching': false,
  'ordering': true
})
thead.append('tr')
  .classed('schemaRow', true)
  .selectAll('th')
  .data(title)
  .enter()
  .append('th')
  .attr('column-index', (d,i)=>i)
  .attr('contenteditable', false)
  .classed('p-0', true)
  .append('select')
  .selectAll('option')
  .data(schema)
  .enter()
  .append('option')
  .text(d => d)

 div.select('.dataTables_length').style('display', 'none')
}

function uploadLink() {
  let file = $('#linkTableUpload').prop('files')[0]
  if(!file) return
  let filename = file.name
  d3.select('#linkTableName').text(filename)
  context.name = new String(filename).slice(0, -4) // drop '.csv'
  d3.select('#linkTableDiv').html('')
  let r = new FileReader()
  r.onload = function (e) {
    let text = e.target.result
    let data = Papa.parse(text, {skipEmptyLines: true}).data
    setTable(data, 'linkTableDiv', 'link')
    context.nodeTable = null
    context.nodeSchema = null
  }
  r.readAsText(file)
}
function uploadNode () {
  let file = $('#nodeTableUpload').prop('files')[0]
  if(!file) return

  let filename = file.name
  d3.select('#nodeTableName').text(filename)
  d3.select('#nodeTableDiv').html('')
  let r = new FileReader()
  r.onload = function (e) {
    let text = e.target.result
    let data = Papa.parse(text, {skipEmptyLines: true}).data
    setTable(data, 'nodeTableDiv', 'node')
  }
  r.readAsText(file)
}

let testNodeLink =async function () {
  // NOT WORKING QWQ
  let linkFile = new File('Marie Boucher LinkTable.csv');
  console.log(linkFile)
  uploadLink(linkFile, function() {
    context.linkSchema = {
      'id': 0,
      'source': 1,
      'target': 5,
      'linkType': 3,
      'time': 10
    }
    context.timeFormat = 'DD/MM/YYYY'
  })
  let nodeFile = new File('Marie Boucher NodeTable.csv');
  uploadNode(nodeFile, function() {
    context.nodeSchema = {
      'id': 0,
      'label': 1,
      'group': 2
    }
    updateNetwork()
  })
}
