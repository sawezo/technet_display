// VARIABLES ------------------------------------------------------------
var dev = false; // dev printouts to console

// elements
var figure = d3.select("#scrolly figure"); // the graph region
var scrolly_canvas = d3.select("#scrolly_canvas"); // the graph itself
var step = d3.selectAll("#scrolly article .step"); // all individual steps

// initialize the scrollama
var scroller = scrollama();

// network
var simulation;
var node;
var link;
var svg;
var color;
var radius;
var repulsion;
var width;
var height;

// other
var faded_in_imgs;
var click_idx;
var label_idx;
var label;
var label_min_size;
var label_max_size;
var linesToAdd;
var lineAdditionIdx;
var images;
var image_h;
var image_w;
var weights;
var edgeWeightScale;
var mouse_tools;


// FUNCTIONS ------------------------------------------------------------
// network visualization
function setupNetworkGraph(){
  scrolly_canvas.append("svg")
                .attr("id", "network")
                .attr("width", width+"%")
                .attr("height", height+"%");
}

function drag(simulation){
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(.01).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return d3.drag().on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

function grow_node(d, e) {
  // node size
  d3.select(this).select("circle").transition()
      .duration(1500)
      .attr("r", radius*1.5);


  // node label
  d3.select(this).select("text").transition()
      .duration(1500)
      .attr("x", radius+(radius*.6))
      .style("stroke", "black")
      .style("stroke-width", ".5px")
      .attr("style", "font-size: "+label_max_size+";");
}

function shrink_node() {
  d3.select(this).select("circle").transition()
      .duration(1500)
      .attr("r", radius);

  d3.select(this).select("text").transition()
      .duration(1500)
      .attr("x", radius+(radius*.2))
      .attr("style", "font-size: "+label_min_size+";");
}

function addImage(img, defs){
  defs.append('pattern')
      .attr("id", img)
      .attr("height", 1)
      .attr("width", 1)
      .append("svg:image")
      .attr("xlink:href", "./imgs"+img)
      .attr("height", image_h)
      .attr("width", image_w)
      .attr("x", 0)
      .attr("y", 0)
}    

function ticked(){
    node = d3.selectAll("#node_group g");
    link = d3.selectAll("#link_group path");

    node.attr("cx", function(d) { return d.x = Math.max(radius, Math.min(width - radius, d.x))})
        .attr("cy", function(d) { return d.y = Math.max(radius, Math.min(height - radius, d.y))})
        .attr("transform", d => `translate(${d.x}, ${d.y})`);

    linkArc = d =>`M${d.source.x},${d.source.y}A0,0 0 0,1 ${d.target.x},${d.target.y}`
    link.attr("d", linkArc);
}

function addLines(cursor, coords=true){
  if (!(lineAdditionIdx >= linesToAdd.length)){
    const line = linesToAdd[lineAdditionIdx]
    const new_node = {id:line.source, group:line.source_group};
    if (coords===true){
      const coords = d3.pointer(cursor);
      new_node["x"] = coords[0];
      new_node["y"] = coords[1];
    }
    nodes.push(new_node);

    const target_id = nodes.findIndex(n => n.id === line.target);
    links.push({source:nodes[nodes.length-1], // the new node 
		target:nodes[target_id], value:line.value, source_group:line.source_group});
    
    lineAdditionIdx += 1
    update(initial=false);

  }
  else{
    console.log(lineAdditionIdx, linesToAdd)
  }
}

function removeLine(d){
  const name = d["target"]["__data__"]["id"]
  const associated_link_idxs = []

  for (var i=0; i<links.length; i++){
    if (links[i].source.id == name){ 
      associated_link_idxs.push(i);
    }
    if (links[i].target.id == name){
      associated_link_idxs.push(i);
    }
  }  

  for (var i = associated_link_idxs.length-1; i >=0; i--){
    links.splice(associated_link_idxs[i], 1);
  }

  nodes.splice(d["target"]["__data__"]["index"], 1);

  update(initial=false);
}

function update(initial=true){
  if (initial!==true){
    d3.selectAll("#link_group").selectAll("*").remove();
    d3.selectAll("#node_label").remove();
    d3.selectAll("#node_group").remove();
  }
  
  var link = svg.append("g")
                .attr("fill", "none")
                .attr("stroke-width", 1.5)
                .attr("id", "link_group")
                
                .selectAll("path")
                .data(links)
                .join("path")
                .attr("class", "link")
                .attr("id", "link")
                .attr("stroke", "grey")
                .attr("marker-end", d => `url(${new URL(`#arrow-${d.group}`, location)})`);      
                              
  if (mouse_tools===true){
    var node = svg.append("g") 
                  .attr("fill", "currentColor")
                  .attr("id", "node_group")
                  .attr("stroke-linecap", "round")
                  .attr("stroke-linejoin", "round")
                  .selectAll("g")
                  .data(nodes)
                  .join("g")
                  .on("mouseover", grow_node)
                  .on("mouseout", shrink_node)
                  .on("dblclick", d => removeLine(d))
                  .call(drag(simulation));
  }

  else {
    var node = svg.append("g") 
                  .attr("fill", "currentColor")
                  .attr("id", "node_group")
                  .attr("stroke-linecap", "round")
                  .attr("stroke-linejoin", "round")
                  .selectAll("g")
                  .data(nodes)
                  .join("g")
                  .call(drag(simulation));
  }

  if (weights===true){
    d3.selectAll("#link")
      .attr('stroke-width', function(d) {
        return edgeWeightScale(d.weight);
      });
  }

  if (image===true){    
    const images = new Set();
    d3.selectAll(node)
      .each(function(d){
        if (!images.has(d.image)){
          images.add(d.image)
        }
    });
  
    
    var defs = svg.append("defs");
    images.forEach(d =>
      addImage(d, defs)
    );

    node.append("circle")
        .attr("class", "node")
        .attr("stroke", "white")
        .attr("stroke-width", 3)
        .attr("r", radius)
        .attr("fill", d => "url(#"+d.image+")");
  }

  else{
    node.append("circle")
                .attr("class", "node")
                .attr("stroke", "white")
                .attr("stroke-width", 1.5)
                .attr("r", radius)
                .attr("fill", "#eee")       
                .attr('fill', d => color(d.group));
  }


  if (label===true){
    node.append("text") // labels
        .attr("id", "node_label")
        .attr("x", radius+(radius*.2))
        .attr("y", "0.70em")
        .text(d => d.id)
        .attr("class", ".node_label")
        .attr("style", "font-size: "+label_min_size+";");
  }
      
  // updating then restarting the simulation
  simulation.force("link", d3.forceLink(links).id(d => d.id))
  simulation.nodes(nodes);
  simulation.restart();
}
  
function network(data_file, coords=true, label=true){
    d3.csv("data/"+data_file).then(function(lines){
        
        // Data Preparation ---------------------------------------------------------
        node_groups = Array.from(new Set(lines.map(d => d.source_group)))
        color = d3.scaleOrdinal(node_groups, d3.schemeCategory10)

        if (weights===true){
          var edge_weights = Array.from(lines.map(d => parseInt(d.weight)));
          edgeWeightScale = d3.scaleLinear().domain([Math.min(...edge_weights), Math.max(...edge_weights)]).range([1, 5]);
        }


        nodes = {};
        lines.forEach(function(line) {
            nodes[line.source] = {id:line.source, group:line.source_group, image:line.source_image};
            if (line.target !== ""){ 
                nodes[line.target] = {id:line.target, group:line.target_group, image:line.target_image};
            }
        }); 
        nodes = Object.keys(nodes).map(node => nodes[node])
        links = lines.filter(link => !(link.target===""));


        // SVG handling ---------------------------------------------------------
        svg = d3.select("#network"); // SVG element and parameters
        width = parseInt(svg.style("width"))
        height = parseInt(svg.style("height"))
    
        svg.attr("preserveAspectRatio", "xMinYMin meet")
           .on("click", cursor => addLines(cursor, coords=coords));
        
        
        // Simulation initialization ---------------------------------------------------
        simulation = d3.forceSimulation(nodes)
                       .force("link", d3.forceLink(links).id(d => d.id))
                       .force("charge", d3.forceManyBody().strength(-300))
                       .force("x", d3.forceX())
                       .force("y", d3.forceY())
                       .force('collide', d3.forceCollide(d => repulsion))
                       .force("center", d3.forceCenter(width/2, height/2))
                       .on("tick", ticked);
        
        update(); // to draw the initial graph
    });
}


// text and images
function addInstruction(text){
  figure.select("#instructions")
    .append("text")
    .attr('class', 'instruction_text')
    .text(text);
}

function animateTitleCardText() {
  var title = new TimelineMax();
  title.staggerFromTo(".title span", 0.5, 
    {ease: Back.easeOut.config(1.7), opacity: 0, bottom: -80},
    {ease: Back.easeOut.config(1.7), opacity: 1, bottom: 0}, 0.05);
  title.timeScale(1)
}

function addTitleCard(imagePATH, titleID, titleHTML){
  // adding the animated title card text to the scrolly slide 
  d3.select(titleID)
    .html(titleHTML)
  
  $(".title").lettering();
  animateTitleCardText();


  // adding the image to the scrolly canvas and fading it in  
  scrolly_canvas
    .append("img")
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('class', 'title_card_image');

  $('.title_card_image').fadeOut(2000, function() {
    $('.title_card_image').attr("src", imagePATH);
    $('.title_card_image').fadeIn(2000);
  });
}

function addBasicImage(path){
  scrolly_canvas.append("div")
    .attr("class", "basic_img_container")
    .append("img")
    .attr("class", "basic_img")
    .attr("src", path);
}

function setupImagesToFadeIn(img2id, img2width){
  scrolly_canvas.append("div")
    .attr("class", "fade_in_img_container")

  Object.keys(img2id).forEach(path=>{
    d3.select(".fade_in_img_container").append("img")
                                        .attr("class", "img_to_fade_in")
                                        .attr("id", img2id[path])
                                        .attr("src", path)
                                        .attr("onclick", "fadeInImage(this)");
  });
                                      
  if (img2width!=null){
    Object.keys(img2width).forEach(path=>{
      d3.select("#"+img2id[path])
        .attr("style", "width: "+img2width[path]+"%;")
    });
  }

  else { // using an equal width split
    const img_width = Math.floor(100/Object.keys(img2id).length)
    d3.selectAll(".img_to_fade_in")
      .attr("style", "width: "+img_width+"%;")
  }      
}

function fadeInImage(el){
  $(".instruction_text").remove();
  
  if (!faded_in_imgs.includes(el.id)){
    el.style.opacity = 0;
    var tick = function(){
      el.style.opacity = +el.style.opacity + 0.01;
      if (+el.style.opacity < 1) {
        (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16)
      }
    };
    
    tick();
    faded_in_imgs.push(el.id)
  }
}

function addImageLabel(click, label_idx2label_data){
  label_idx += 1;

  if (Object.keys(label_idx2label_data).includes(label_idx.toString())){
   console.log("--x: "+click["screenX"]+"px;")
    const label2data = label_idx2label_data[label_idx]
    d3.select(".fade_in_img_container")
      .append("div")
      .attr("class", "hover_label_text_container")
      .attr("style", "--x_coordinate: "+label2data["x"]+"%; --y_coordinate: "+label2data["y"]+"%;")
      
      .append("text")
      .attr("class", "hover_label_text")
      .text(label2data["label"]);
  }
}

function addImageToFadeSwap(el_id, startPath, replacementPath){
  scrolly_canvas.append("img")
                .attr("src", startPath)
                .attr("id", el_id)
                .attr("class", "fade_replaced_img")
                .attr("onclick", `fadeSwapImage(this.id, '${replacementPath}');`);
}

function fadeSwapImage(el_id, replacementPath){
  $("#"+el_id).fadeOut(2000, function() {
      $("#"+el_id).attr("src", replacementPath);
      $("#"+el_id).attr("class", "fade_replaced_img");
      $("#"+el_id).fadeIn(2000);
  });
}

function updateProgress(response){
  const step_ct = step["_groups"][0].length;
  const progress_chunk = 100/step_ct
  figure.select("#progress_bar").property('value', progress_chunk*(response.index+1));
}

function replaceImageWithGraph(d, graphPath){
  d3.select(".basic_img_container").remove();
  uploadHtmlGraph(graphPath);
}

function uploadHtmlGraph(filePath){
  figure.append("div")
    .attr("class", "html_graph")
    .html("<iframe width='100%' height='100%' frameborder='3' scrolling='no' src='"+filePath+"'></iframe>");
}

// scrollytelling
function handleResize(){
  // step slide window height
  var stepH = Math.floor(window.innerHeight*0.7);
  step.style("height", stepH + "px");


  // step vizualization figure (holding the canvas and progress bar) sizing
  var figureHeight = window.innerHeight *.65;
  var figureMarginTop = (window.innerHeight-figureHeight)/2;
  figure.style("height", figureHeight + "px")
        .style("top", figureMarginTop + "px");


  // scrollama callback to get updated dimensions from the DOM (always use)
  scroller.resize();
}

function handleStepEnter(response){  
  if (dev===true){
    // response = { element, direction, index }
    console.log("entering new step with response: ", response);
  }


  // styling for the currently active step
  step.classed("is-active", function(d, i){
    return i === response.index;
  });


  // global step jobs
  updateProgress(response) // updating the progress bar
  label_idx = 0; 
  faded_in_imgs = [];


  // step specific updates 
  const stepId = response["element"]["id"]
  
  
  // preview 
  if (stepId==="0"){ 
    // after
    d3.selectAll(".title_card_image").remove();

    addInstruction("drag")

    width = 100;
    height = 100;
    lineAdditionIdx = 0
    repulsion = 29;
    radius = 10;
    image = false;
    
    label = false;
    label_min_size = 15;
    label_max_size = 30;
  
    mouse_tools = true;
    weights = false;
    
    setupNetworkGraph()
    simulation = network("hook_network.csv", coords=true);
  }


  // PART 1
  else if (stepId==="title_card_1"){ 
    // from previous
    $(".instruction_text").remove();
    d3.selectAll("#network").remove();
    
    // from next (if scrolling up)
    $(".instruction_text").remove();
    d3.selectAll(".fade_in_img_container").remove();

    addTitleCard("./imgs/title1.png", "#"+stepId,
      "<div class='title-container'><h1><span class='title'>- Part I -</span><span class='title'>Problem</span><span class='title'>& Context</span></h1></div>")
  }
  
  else if (stepId==="1a"){ 
    d3.selectAll(".title_card_image").remove();

    $(".instruction_text").remove();
    d3.selectAll(".fade_in_img_container").remove();
    d3.selectAll(".fade_replaced_img").remove(); 
    
    addInstruction("click this square")

    const img2id = {"./imgs/coi_net.png":"coi_net"}
    const img2width = {"./imgs/coi_net.png": 100}
    setupImagesToFadeIn(img2id, img2width) 
  }
  
  else if (stepId==="1b"){ 
    $(".instruction_text").remove();
    d3.selectAll(".fade_in_img_container").remove();

    d3.selectAll("#network").remove();
    
    addInstruction("click each box to reveal a critical data source")
    
    addImageToFadeSwap("graph_swap_img_tm", "./imgs/question_box.png", "./imgs/fpds.png")
    addImageToFadeSwap("graph_swap_img_bl", "./imgs/question_box.png", "./imgs/sam.png")
    addImageToFadeSwap("graph_swap_img_br", "./imgs/question_box.png", "./imgs/usas.png")
    
    // make images fit the window
    scrolly_canvas.select("#graph_swap_img_tm").attr("style", "padding-left:7%; float:left; padding-top: 16%; height:35%; width:21%;");
    scrolly_canvas.select("#graph_swap_img_bl").attr("style", "padding-left:7%; float:left; padding-top: 16%; height:35%; width:21%;");
    scrolly_canvas.select("#graph_swap_img_br").attr("style", "padding-left:7%; float:left; padding-top: 16%; height:35%; width:21%;");
  }

  else if (stepId==="1c"){ 
    $(".instruction_text").remove();
    d3.selectAll(".fade_in_img_container").remove();
    d3.selectAll(".fade_replaced_img").remove(); 

    d3.selectAll("#network").remove();

    addInstruction("hover/drag nodes to move")

    width = 100;
    height = 100;
    lineAdditionIdx = 0
    repulsion = 80;
    radius = 30;
    image = false;
    
    label = true;
    label_min_size = 15;
    label_max_size = 30;
  
    mouse_tools = true;
    weights = false;
    
    setupNetworkGraph()
    simulation = network("intro_network.csv", coords=true);
  }

  else if (stepId==="1d"){ 
    d3.selectAll("#network").remove();



    width = 100;
    height = 100;
    lineAdditionIdx = 0
    repulsion = 80;
    radius = 20;
    image = false;
    
    label = true;
    label_min_size = 10;
    label_max_size = 20;
  
    mouse_tools = true;
    weights = false;
    
    setupNetworkGraph()
    simulation = network("intro_network2.csv", coords=true);
  }


  // PART 2
  if (stepId==="title_card_2"){ 
    $(".instruction_text").remove();
    d3.selectAll("#network").remove();

    $(".instruction_text").remove();
    scrolly_canvas.select(".html_graph").remove();

    addTitleCard("./imgs/title2.png", "#"+stepId,
      "<div class='title-container'><h1><span class='title'>- Part II -</span><span class='title'>Analysis</span><span class='title'>Gallery</span></h1></div>")
  }

  else if (stepId==="2a"){ 
    d3.selectAll(".title_card_image").remove();

    $(".instruction_text").remove();
    scrolly_canvas.select(".html_graph").remove();

    addInstruction("click, drag, zoom and hover")

    const graphPath = "interactive_diagrams/vendor_map.html"
    uploadHtmlGraph(graphPath);
  }

  else if (stepId==="2b"){ 
    $(".instruction_text").remove();
    scrolly_canvas.select(".html_graph").remove();

    addInstruction("hover")

    const graphPath = "interactive_diagrams/sankey.html"
    uploadHtmlGraph(graphPath);
  }

  else if (stepId==="2c"){ 
    $(".instruction_text").remove();
    scrolly_canvas.select(".html_graph").remove();

    d3.selectAll(".title_card_image").remove();

    addInstruction("may take a second to load; hover or click to zoom in when ready")

    const graphPath = "interactive_diagrams/treemap.html"
    uploadHtmlGraph(graphPath);
  }


  // PART 3
  if (stepId==="title_card_3"){ 
    $(".instruction_text").remove();
    d3.selectAll(".html_graph").remove();

    $(".instruction_text").remove();
    d3.select(".fade_in_img_container").remove();
    d3.select(".fade_replaced_img").remove();
    d3.select(".basic_img_container").remove();

    addTitleCard("./imgs/title3.png", "#"+stepId,
    "<div class='title-container'><h1><span class='title'>- Part III -</span><span class='title'>Use Case</span></h1></div>")
  }

  else if (stepId==="3a"){
    d3.selectAll(".title_card_image").remove();

    $(".instruction_text").remove();
    d3.select(".fade_in_img_container").remove();
    scrolly_canvas.selectAll(".basic_img_container").remove();

    addBasicImage("./imgs/coi.png")
  }

  else if (stepId==="3b"){ 
    $(".instruction_text").remove();
    d3.select(".fade_in_img_container").remove();
    d3.select(".fade_replaced_img").remove();
    d3.select(".basic_img_container").remove();

    addInstruction("click empty space to reveal each piece of plan")

    const img2id = {"./imgs/implementation_1.png":"implementation_1", 
                    "./imgs/implementation_2.png":"implementation_2",
                    "./imgs/implementation_3.png":"implementation_3"};

    const img2width = {"./imgs/implementation_1.png":55,
                       "./imgs/implementation_2.png":20,
                       "./imgs/implementation_3.png":20}

    setupImagesToFadeIn(img2id, img2width)
  }

  else if (stepId==="3c"){ 
    $(".instruction_text").remove();
    d3.select(".fade_in_img_container").remove();
    scrolly_canvas.selectAll(".basic_img_container").remove();

    d3.selectAll("#network").remove();
    $(".instruction_text").remove();

    addInstruction("double-click to clarify the blueprint")

    addImageToFadeSwap("img_swap", "./imgs/KnowledgeGraph2.png", "./imgs/KnowledgeGraph.png")
    scrolly_canvas.select(".fade_replaced_img").attr("style", "width:65%;  margin-left: 12%; height:95%;");                                  
  }

  else if (stepId==="3d"){
    $(".instruction_text").remove();
    d3.select(".fade_in_img_container").remove();
    d3.select(".fade_replaced_img").remove();
    d3.select(".basic_img_container").remove();
    
    d3.selectAll(".html_graph").remove();

    addInstruction("drag")

    repulsion = 20;
    radius = 15;

    linesToAdd = [];
	  
    image = true;
    image_h = 25;
    image_w = 30;
    
    label = false;
    weights = true;
    mouse_tools = false;
    
    setupNetworkGraph()
    simulation = network("coi_network.csv", coords=true);
  }

  else if (stepId==="3e"){ 
    d3.selectAll("#network").remove();
    $(".instruction_text").remove();

    addInstruction("hover")

    const graphPath = "interactive_diagrams/old_vs_new_process.html"
    uploadHtmlGraph(graphPath);
  }
}


// mainline
function run(){

  // resize items on load to ensure proper sizing
  handleResize();


  // set the scroller with options, then bind scrollama event handlers
  scroller.setup({
                  step: "#scrolly article .step", // main selector for the steps
                  offset: 0.5, // how far from the top to place step trigger line 
                  debug: dev // show debugging tools
  })

    // callbacks
    .onStepEnter(handleStepEnter); // run when step boundary is tripped


  // setup window resize event
  window.addEventListener("resize", handleResize);
}
run();