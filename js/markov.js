class MarkovNode {
    constructor(x, y, r, id) {
        this.constructorName = "MarkovNode";
        this.label = "";
        this.x = x;
        this.y = y;
        this.r = r;
        this.id = id;
        this.isSelected = 0;
    }
}

class MarkovEdge {
    constructor(startNode, goalNode, probability) {
        this.constructorName = "MarkovEdge";
        this.startNodeId = startNode.id;
        this.goalNodeId = goalNode.id;
        this.id = this.startNodeId+ "+" + this.goalNodeId;
        this.probability = probability;
        this.isSelected = 0;
        this.selectionDate = null;
        this.isSelfReferencing = false;
    }
}

class MarkovChain {
    constructor(nodes = [], edges = [], settings = {}) {
        this.constructorName = "MarkovChain";
        this.label = "";
        this.currentNodeId = "0";
        this.nodes = nodes;
        this.edges = edges;
        this.settings = settings;
    }
    addNode(node) {
        this.nodes.push(node);
    }
    getNodeById(nodeId) {
        return this.nodes.filter(node => node.id === nodeId)[0];
    }
    updateNodeLabelById(nodeId, newLabel) {
        const targetNode = this.getNodeById(nodeId);
        targetNode.label = newLabel;
    }
    addEdge(edge) {
        if (!this.isDuplicateEdge(edge)) {
            this.edges.push(edge);
        }else {
            throw new Error("Edge already exists!");
        }
    }
    getEdgeById(edgeId) {
        return this.edges.filter(edge => edge.id === edgeId)[0];
    }
    updateEdgeProbabilityById(edgeId, newProbability) {
        const targetEdge = this.getEdgeById(edgeId);
        targetEdge.probability = newProbability;
    }
    getSelectedNodes() {
        return this.nodes.filter(node => node.isSelected).sort((a, b) => a.selectionDate > b.selectionDate ? 1 : 0);
    }
    createOneWayConnection() {
        const selectedNodes = this.getSelectedNodes();
        if (selectedNodes.length === 1) {
            const edge = new MarkovEdge(selectedNodes[0], selectedNodes[0], 0.5);
            edge.isSelfReferencing = true;
            this.addEdge(edge);
        }else if (selectedNodes.length === 2) {
            const edge = new MarkovEdge(selectedNodes[0], selectedNodes[1], 0.5);
            this.addEdge(edge);
        }else {
            throw new Error("One or two nodes have to be selected for one-way connection!");
        }
    }
    createTwoWayConnection() {
        const selectedNodes = this.getSelectedNodes();
        if (selectedNodes.length === 2) {
            const edge1 = new MarkovEdge(selectedNodes[0], selectedNodes[1], 0.5);
            const edge2 = new MarkovEdge(selectedNodes[1], selectedNodes[0], 0.5);
            this.addEdge(edge1);
            this.addEdge(edge2);
        }else {
            throw new Error("Precisely two nodes have to be selected for two-way connection!");
        }
    }
    isDuplicateEdge(toBeCheckedEdge) {
        for (const edge of this.edges) {
            if (toBeCheckedEdge.id === edge.id) {
                return true;
            }
        }
        return false;
    }
    deleteSelectedNodesAndRelatedEdges() {
        const selectedNodes = this.getSelectedNodes();
        this.nodes = this.nodes.filter(node => {
            for (const selected of selectedNodes) {
                if (node.id === selected.id) {
                    return false;
                }
            }
            return true;
        });
        this.edges = this.edges.filter(edge => {
            for (const selected of selectedNodes) {
                if (edge.id.includes(selected.id)) {
                    return false;
                }
            }
            return true;
        });
    }
    getNodeEdgesById(nodeId) {
        return this.edges.filter(edge => edge.id.split("+")[0] === nodeId);
    }
    getNextNodeId() {
        const currentNodeEdges = this.getNodeEdgesById(this.currentNodeId);
        const pSum = currentNodeEdges.reduce((sum, edge) => sum += edge.probability, 0);
        if (pSum >= 0.99) {
            let roll = Math.random();
            for (const edge of currentNodeEdges) {
                roll -= edge.probability;
                if (roll <= 0) {
                    return edge.goalNodeId;
                }
            }
        }else {
            throw new Error("Edge probabilities of a specified node must sum up to 1!");
        }
    }
    deselectAllNodes() {
        this.nodes.forEach(node => node.isSelected = false);
    }
    update() {
        const nextNodeId = this.getNextNodeId();
        const nextNode = this.getNodeById(nextNodeId);

        this.deselectAllNodes();
        nextNode.isSelected = true;

        this.currentNodeId = nextNodeId;
        return nextNode.label;
    }
    reset() {
        this.deselectAllNodes();
        this.currentNodeId = "0";
    }
}

const app = {
    canvas: document.querySelector("#canvas"),
    ctx: this.canvas.getContext("2d"),
    nodeInfoDiv: document.querySelector(".node-info"),
    settings: {
        currentNodeRadius: 20,
        defaultNodeColor: "black",
        defaultEdgeWidth: 2,
        defaultEdgeColor: "white",
        selectedNodeColor: "white",
        defaultNodeIdColor: "white",
        selectedNodeIdColor: "black",
        defaultNodeIdSize: 15,
        currentIndicatorRadius: 10,
        defaultIndicatorColor: "red",
        defaultIndicatorTextSize: 10,
    },
    state: {
        currentNodeCounter: 0,
        mode: 0,
        isShiftDown: false,
    },
    chain: new MarkovChain(),
}
 
function createNode(e) {
    const x = e.clientX, y = e.clientY;
    const node = new MarkovNode(x, y, app.settings.currentNodeRadius, app.state.currentNodeCounter.toString())
    app.state.currentNodeCounter++;
    return node;
}

function deselectAllNodes() {
    app.chain.deselectAllNodes();
}

function detectAndHandleNodeSelection(e) {
    const x = e.clientX, y = e.clientY;
    for (const node of app.chain.nodes) {
        if (Math.hypot((node.x - x), (node.y - y)) < node.r) {//If click was within radius of node.
            node.isSelected ^= 1;//Toggle node's isSelected property.
            node.selectionDate = Date.now();//Add click date to track selection order.
            //TODO: display
            return true;
        }
    }
    deselectAllNodes();//If no node has been clicked, deselect all of them.
    emptyNodeInfoDiv();
    return false;
}

function handleClick(e) {
    const mode = app.state.mode;
    if (mode === 0) {
        const node = createNode(e);
        app.chain.addNode(node);
    }else if (mode === 1) {
        detectAndHandleNodeSelection(e);
    }
}

// function createOneWayConnection() {
//     const selectedNodes = app.chain.getSelectedNodes();
//     if (selectedNodes.length === 1) {
//         const edge = new MarkovEdge(selectedNodes[0], selectedNodes[0], 0.5, app.settings.defaultEdgeColor);
//         if (!app.chain.isDuplicateEdge(edge)) {
//             app.chain.addEdge(edge);
//         } else {
//             throw new Error("Edge already exists!");
//         }
//     } else if (selectedNodes.length === 2) {
//         const edge = new MarkovEdge(selectedNodes[0], selectedNodes[1], 0.5, app.settings.defaultEdgeColor);
//         if (!app.chain.isDuplicateEdge(edge)) {
//             app.chain.addEdge(edge);
//         }else {
//             throw new Error("Edge already exists!");
//         }
//     }else {
//         throw new Error("One or two nodes have to be selected for one-way connection!");
//     }
// }

// function createTwoWayConnection() {
//     const selectedNodes = app.chain.getSelectedNodes();
//     if (selectedNodes.length === 2) {
//         const edge1 = new MarkovEdge(selectedNodes[0], selectedNodes[1], 0.5, app.settings.defaultEdgeColor);
//         const edge2 = new MarkovEdge(selectedNodes[1], selectedNodes[0], 0.5, app.settings.defaultEdgeColor);
//         app.chain.addEdge(edge1);
//         app.chain.addEdge(edge2);
//     }else {
//         throw new Error("Precisely two nodes have to be selected for two-way connection!");
//     }
// }

function handleKeyboardCommands(e) {
    console.log(e.keyCode);
    const code = e.keyCode;
    if (app.state.isShiftDown) {
        if (code === 69) {//e: one-way connection
            app.chain.createOneWayConnection();
        }else if (code === 68) {//d: two-way connection
            app.chain.createTwoWayConnection();
        }else if(code === 73) {//i: display selected node's info
            displaySelectedNodeInfo();
        }else if(code === 85) {//u: update selected node from input
            updateNodeFromInput();
        }
    }else if (code === 17) {//lctrl: change mode
        //implement function to change mode
        app.state.mode ^= 1;
    }else if (code === 46) {//delete: delete selected nodes and edges
        app.chain.deleteSelectedNodesAndRelatedEdges();
    }
}

function handleShiftDown(e) {
    const code = e.keyCode;
    if (code === 16) {
        app.state.isShiftDown = true;
    }
}

function handleShiftUp(e) {
    const code = e.keyCode;
    if (code === 16) {
        app.state.isShiftDown = false;
    }
}

function initEventListeners() {
    app.canvas.addEventListener("click", handleClick, false);
    document.addEventListener("keydown", handleKeyboardCommands, false);
    document.addEventListener("keydown", handleShiftDown, false);
    document.addEventListener("keyup", handleShiftUp, false);
}

function clearCanvas(canvas, context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
}


function renderNodes(context, nodes) {
    nodes.forEach(node => {
        //Render node:
        context.fillStyle = node.isSelected ? app.settings.selectedNodeColor : app.settings.defaultNodeColor;
        context.beginPath();
        context.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        context.fill();
        context.closePath();
        
        //Display node id:
        context.fillStyle = node.isSelected ? app.settings.selectedNodeIdColor : app.settings.defaultNodeIdColor;
        context.textAlign = "center";
        context.font = app.settings.defaultNodeIdSize + "px Arial";
        context.fillText(node.id, node.x, node.y + app.settings.defaultNodeIdSize / 3);
    });
}

function renderEdges(context, nodes, edges) {
    let startNode, goalNode, distX, distY, slope, indicatorDist;
    edges.forEach(edge => {
        startNode = nodes.filter(node => node.id === edge.startNodeId)[0];
        goalNode = nodes.filter(node => node.id === edge.goalNodeId)[0];

        //Render edge:
        context.strokeStyle = app.settings.defaultEdgeColor;
        context.lineWidth = app.settings.defaultEdgeWidth;
        context.beginPath();
        context.moveTo(startNode.x, startNode.y);
        context.lineTo(goalNode.x, goalNode.y);
        context.stroke();
        context.closePath();
    });
}

function renderEdgeIndicators(context, nodes, edges) {
    let startNode, goalNode, distX, distY, slope, indicatorDist;
    edges.forEach(edge => {
        startNode = nodes.filter(node => node.id === edge.startNodeId)[0];
        goalNode = nodes.filter(node => node.id === edge.goalNodeId)[0];

        //Render edge indicator:
        context.fillStyle = startNode.isSelected ? app.settings.selectedNodeColor : app.settings.defaultNodeColor;
        context.beginPath();
        if (!edge.isSelfReferencing) {
            distX = (goalNode.x - startNode.x) / 3;
            distY = (goalNode.y - startNode.y) / 3;
            context.arc(startNode.x + distX, startNode.y + distY, app.settings.currentIndicatorRadius, 0, Math.PI * 2);
        }else {
            context.arc(startNode.x, startNode.y - app.settings.currentNodeRadius , app.settings.currentIndicatorRadius, 0, Math.PI * 2);
        }
        context.fill();
        context.closePath();

        //Display edge probability:
        context.fillStyle = startNode.isSelected ? app.settings.selectedNodeIdColor : app.settings.defaultNodeIdColor;
        context.textAlign = "center";
        context.font = app.settings.defaultIndicatorTextSize + "px Arial";
        if (!edge.isSelfReferencing) {
            context.fillText(edge.probability, startNode.x + distX, startNode.y + distY + app.settings.currentIndicatorRadius / 3);
        }else {
            context.fillText(edge.probability, startNode.x, startNode.y - app.settings.currentNodeRadius);
        }
    });    
}

function emptyNodeInfoDiv() {
    app.nodeInfoDiv.innerHTML = "";
}

function displaySelectedNodeInfo() {
    const selectedNode = app.chain.getSelectedNodes()[0];
    if (selectedNode) {
        emptyNodeInfoDiv();
        const selectedNodeEdges = app.chain.getNodeEdgesById(selectedNode.id);

        let nodeLabelDiv = document.createElement("input");
        nodeLabelDiv.id = selectedNode.id;
        nodeLabelDiv.classList.add("node-label");
        nodeLabelDiv.value = selectedNode.label;
        app.nodeInfoDiv.append(nodeLabelDiv);

        let edgeDiv;
        for (const edge of selectedNodeEdges) {
            edgeDiv = document.createElement("div");
            edgeDiv.classList.add("edge");
            edgeDiv.innerHTML = `
                <div class="edge-id">${edge.id}</div>
                <input type="text" id="${edge.id}" class="edge-probability" value=${edge.probability}>
            `;
            app.nodeInfoDiv.append(edgeDiv);
        }
    }
}

function updateNodeFromInput() {
    const nodeLabel = document.querySelector(".node-label");
    const edgeProbDivs = document.querySelectorAll(".edge-probability");
    
    let nodeId = nodeLabel.id;
    let nodeLabelVal = nodeLabel.value;
    app.chain.updateNodeLabelById(nodeId, nodeLabelVal);
    
    let edgeId, edgeProbability;
    for (let i = 0; i < edgeProbDivs.length; i++) {
        edgeId = edgeProbDivs[i].id;
        edgeProbability = parseFloat(edgeProbDivs[i].value);
        app.chain.updateEdgeProbabilityById(edgeId, edgeProbability);
    }
}

function renderChain(context, chain) {
    renderEdges(context, chain.nodes, chain.edges);
    renderNodes(context, chain.nodes);
    renderEdgeIndicators(context, chain.nodes, chain.edges);
}

function mainLoop(time = 0) {
    window.requestAnimationFrame(mainLoop);
    clearCanvas(app.canvas, app.ctx);
    renderChain(app.ctx, app.chain);
}

function saveCurrentChain() {
    const chainLabel = app.chain.label;
    const chainJSON = JSON.stringify([...app.chain.nodes, ...app.chain.edges]);
    localStorage.setItem(chainLabel, chainJSON);
}

function saveCurrentChainAs(label) {
    const chainLabel = label;
    const chainJSON = JSON.stringify([...app.chain.nodes, ...app.chain.edges]);
    localStorage.setItem(chainLabel, chainJSON);
}

function setNodeCounter() {
    const currentIds = app.chain.nodes.map(node => parseInt(node.id));
    const currentMaxId = Math.max(...currentIds);
    app.state.currentNodeCounter = currentMaxId + 1;
}

function getChainByLabel(chainLabel) {
    const chainJSON = localStorage.getItem(chainLabel);
    const chainElements = JSON.parse(chainJSON);
    const chainNodes = chainElements.filter(element => element.constructorName === "MarkovNode");
    const chainEdges = chainElements.filter(element => element.constructorName === "MarkovEdge");
    return new MarkovChain(chainNodes, chainEdges);
}

function loadChainByLabel(chainLabel) {
    app.chain = getChainByLabel(chainLabel);
    setNodeCounter();
}

initEventListeners();
mainLoop();


// const n1 = new MarkovNode(200, 100, app.settings.currentNodeRadius, 0);
// const n2 = new MarkovNode(50, 200, app.settings.currentNodeRadius, 1);
// app.chain.addNode(n1);
// app.chain.addNode(n2);
// app.chain.addEdge(new MarkovEdge(n1, n2, 0.5, "yellow"));