var RECT_SIZE = 12
var INTENT = 0
var LINE_HEIGHT = 12
var GAP_ICONS = 1
var OPACITY_ICONS = .2
var OFFSET = 110
let WIDTH
var dgraph
export let drawBookmark = function (divId) {
  WIDTH = $(`#${divId}`).innerWidth()
  dgraph = window.dgraph
  networkcube.setDefaultEventListener(updateLists)
  networkcube.addEventListener('searchResult', searchResultHandler)
  createSelectionCategory('Node Selections', 'node', divId)
  createSelectionCategory('Link Selections', 'link', divId)
  updateLists()
}

function createSelectionCategory(name, type, divId) {
    var nodeDiv = d3.select(`#${divId}`).append('div')
        .attr('id', 'div_' + type)
    nodeDiv.append('p')
        .attr('id', 'title_' + type)
        .html(name + ':')
    nodeDiv.append('input')
        .datum(type)
        .classed('btn', true)
        .classed('btn-light', true)
        .classed('btn-sm', true)
        .classed('z-depth-0', true)
        .classed('m-0', true)
        .classed('p-1', true)
        .attr('type', 'button')
        .attr('value', '+')
        .on('click', function (d) { createSelection(d) })
}
function createSelection(type) {
    var b = networkcube.createSelection(type)
    var timer = setTimeout(function (e) {
        networkcube.setCurrentSelection(b)
        updateLists()
    }, 500)
}
function updateLists() {
    updateList('node', 'Node Selections')
    updateList('link', 'Link Selections')
    d3.selectAll('.icon_showColor')
        .attr('xlink:href', function (d) {
          if (d.showColor) return './asset/fig/drop-full.png'
        return './asset/fig/drop-empty.png' })
    d3.selectAll('.icon_eye')
        .attr('xlink:href', function (d) {
          if (d.filter) return './asset/fig/eye-blind.png'
          return './asset/fig/eye-seeing.png' })
    d3.selectAll('.selectionLabel')
        .text(function (d) { return d.name + ' (' + d.elementIds.length + ')' })
}
function updateList(type, name) {
    var selections = dgraph.getSelections(type)
    var title = d3.select('#title_' + type)
    title.html(name + ' (' + selections.length + ')')
    d3.select('#div_' + type)
        .selectAll('.selectionDiv_' + type)
        .remove()
    var nodeGs = d3.select('#div_' + type)
        .selectAll('.selectionDiv_' + type)
        .data(selections.sort(networkcube.sortByPriority))
        .enter()
        .append('div')
        .attr('class', 'selectionDiv_' + type)
        .style('height', `${1.8 * LINE_HEIGHT}px`)
        .append('svg')
        .attr('class', 'svg_' + type)
        .attr('height', LINE_HEIGHT)
        .attr('width', WIDTH)
        .append('g')
        .attr('transform', 'translate(' + INTENT + ',0)')
    d3.selectAll('.selectionDiv_' + type)
        .style('height', `${1.8 * LINE_HEIGHT}px`)
        .style('background-color', function (d) {
        if (dgraph.currentSelection_id == d.id)
            return '#dbd6d6'
        return '#ffffff'
    })
    nodeGs.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', RECT_SIZE)
        .attr('height', RECT_SIZE)
        .style('fill', function (d) { return d.color })
        .on('click', function (d) {
        networkcube.setSelectionColor(d, '#' + Math.floor(Math.random() * 16777215).toString(16))
    })
    nodeGs.append('text')
        .attr('class', 'selectionLabel')
        .text(function (d) {
        return d.name
    })
        .style('font-size', RECT_SIZE)
        .style('font-family', 'Helvetica')
        .attr('x', RECT_SIZE + 5)
        .attr('y', RECT_SIZE * .8)
        .on('click', function (d) {
        networkcube.setCurrentSelection(d)
        updateLists()
    })
    var i = 0
    nodeGs.append('svg:image')
        .attr('class', 'icon_showColor icon')
        .attr('x', OFFSET + (RECT_SIZE + GAP_ICONS) * i++)
        .on('click', function (d, i) {
        networkcube.showSelectionColor(d, !d.showColor)
    })
    nodeGs.append('svg:image')
        .attr('id', 'eye_' + name)
        .attr('class', 'icon_eye icon')
        .attr('xlink:href', './asset/fig/eye-seeing.png')
        .attr('x', OFFSET + (RECT_SIZE + GAP_ICONS) * i++)
        .on('click', function (d, i) {
        networkcube.filterSelection(d, !d.filter)
    })
    nodeGs.append('svg:image')
        .filter(function (d) {
          return d.name.indexOf('Unselected') == -1 })
        .attr('class', 'icon')
        .attr('xlink:href', './asset/fig/up.png')
        .attr('x', OFFSET + (RECT_SIZE + GAP_ICONS) * i++)
        .on('click', function (d, i) {
        if (i > 0)
            networkcube.swapPriority(d, d3.selectAll('.selectionDiv_' + d.acceptedType).data()[i - 1])
    })
    nodeGs.append('svg:image')
        .filter(function (d) { return d.name.indexOf('Unselected') == -1 })
        .attr('class', 'icon')
        .attr('xlink:href', './asset/fig/down.png')
        .attr('x', OFFSET + (RECT_SIZE + GAP_ICONS) * i++)
        .on('click', function (d, i) {
        if (d3.selectAll('.selectionDiv_' + d.acceptedType).data()[i + 1])
            networkcube.swapPriority(d, d3.selectAll('.selectionDiv_' + d.acceptedType).data()[i + 1])
    })
    nodeGs.append('svg:image')
        .filter(function (d) { return d.name.indexOf('Unselected') == -1 })
        .attr('class', 'icon')
        .attr('xlink:href', './asset/fig/delete.png')
        .attr('x', OFFSET + (RECT_SIZE + GAP_ICONS) * i++)
        .on('click', function (d, i) {
        networkcube.deleteSelection(d)
    })
    nodeGs.selectAll('.icon')
        .attr('height', RECT_SIZE)
        .attr('width', RECT_SIZE)
}
var searchMessage
function searchResultHandler(m) {
    searchMessage = m
    $('#searchResults').empty()
    var row = $('#searchResults').append('<li></li>')
    if (m.idCompound.nodeIds)
        row.append(`<p class='searchResult'>Nodes: <b> ${m.idCompound.nodeIds.length} </b> <u onclick='saveSearchResultAsSelection>(Save as selection)</u></p>`)
    if (m.idCompound.linkIds)
        row.append(`<p class='searchResult'>Links: <b>' ${m.idCompound.linkIds.length} </b> <u onclick='saveSearchResultAsSelection>(Save as selection)</u></p>`)
}
function saveSearchResultAsSelection(type) {
    var s = networkcube.createSelection(type, searchMessage.searchTerm)
    var selectionIdCompound = new networkcube.IDCompound()
    selectionIdCompound[type + 'Ids'] = searchMessage.idCompound[type + 'Ids']
    var temp = networkcube.makeElementCompound(selectionIdCompound, dgraph)
    window.setTimeout(function () {
        console.log('set selection', selectionIdCompound, s.id)
        networkcube.highlight('reset')
        window.setTimeout(function () {
            networkcube.selection('set', networkcube.makeElementCompound(selectionIdCompound, dgraph), s.id)
        }, 1000)
    }, 1000)
}
function clearSearchSelection() {
    networkcube.highlight('reset')
    $('#searchResults').empty()
}
