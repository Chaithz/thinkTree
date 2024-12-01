"use client";


import React, { useEffect, useRef } from "react";
import * as d3 from "d3";


const KnowledgeGraph = ({ data }) => {
  const svgRef = useRef();
  const tooltipRef = useRef();


  useEffect(() => {
    if (typeof window === "undefined") return; // Ensure client-side rendering


    const svg = d3
      .select(svgRef.current)
      .attr("width", window.innerWidth - 20) //100
      .attr("height", window.innerHeight - 100);  //100


    svg.selectAll("*").remove(); // Clear previous renderings


    const simulation = d3
      .forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).distance(150).id((d) => d.id))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter((window.innerWidth - 100) / 2, (window.innerHeight - 100) / 2));


    // Add links
    const link = svg
      .append("g")
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-width", 2);


    // Add nodes
    const node = svg
      .append("g")
      .selectAll("circle")
      .data(data.nodes)
      .enter()
      .append("circle")
      .attr("r", 15)
      .attr("fill", "#69b3a2")
      .attr("stroke", "#555")
      .attr("stroke-width", 1.5)
      .call(
        d3
          .drag()
          .on("start", dragStarted)
          .on("drag", dragged)
          .on("end", dragEnded)
      )
      .on("mouseover", (event, d) => {
        d3.select(tooltipRef.current)
          .style("opacity", 1)
          .html(`<strong>${d.text}</strong><br>${d.explanation}`)
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY - 10}px`);
      })
      .on("mouseout", () => {
        d3.select(tooltipRef.current).style("opacity", 0);
      });


    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);


      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });


    function dragStarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }


    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }


    function dragEnded(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }


    return () => simulation.stop(); // Cleanup
  }, [data]);


  return (
    <div style={{ position: "relative", height: "100vh" }}>   
      <svg ref={svgRef} style={{ border: "1px solid #ccc" }}></svg>
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          opacity: 0,
          background: "#fff",
          border: "1px solid #ddd",
          padding: "10px",
          borderRadius: "4px",
          pointerEvents: "none",
          boxShadow: "0 0 8px rgba(0,0,0,0.2)",
        }}
      ></div>
    </div>
  );
};


export default KnowledgeGraph;


