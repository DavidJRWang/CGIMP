import React, { Component } from "react";
import server from './server_config';
import axios from "axios";
import { Client } from 'elasticsearch';
import FacetedSearch from './Facets';

import FileUploader from './FileUploader';


class MapControls extends Component {
    constructor(props) {
        super(props);
	this.state = {
	    facets: {}
	}
	this.getFacetsFromElasticsearch = this.getFacetsFromElasticsearch.bind(this);
    }

    componentDidMount() {
	this.getFacetsFromElasticsearch();
    }
    
    getFacetsFromElasticsearch = () => {
	const client = new Client({
	    host: server.elasticAddr
	})
	const facets = [];
	client.get({index: "browser",
		    type: "modules",
		    id: 1},
		   (err, res) => {
		       if (err) {
			   console.log(err);
		       } else {
			   Object.keys(res._source).forEach( (key) => {
			       let facetParams = {
				   dataType: "numeric",
				   componentId: "",
				   dataField: "",
				   title: "",
				   selectAllLabel:"",
				   filterLabel: ""
			       }
			       if (key !== "id" && key !== "node") {
				   facetParams.componentId = key + 'List';
				   facetParams.title = key;
				   facetParams.selectAllLabel = 'All ' + key;
				   facetParams.filterLabel = key;
				   if (isNaN(res._source[key])) {
				       facetParams.dataField = key + '.keyword';
				       facetParams.dataType = "text";
				   } else {
				       facetParams.dataField = key;
				   }
				   facets[key + 'List'] = facetParams;
			       }
			   });
			   this.setState({facets: facets},
					 () => {
					     //console.log(this.state.facets);
					 });
		       }
		   });
    }

    render() {
	const keys = Object.keys(this.state.facets);
        keys.push("mainSearch", "resultsList");
	const dataFields = [];
	Object.keys(this.state.facets).forEach( (key) => {
	    dataFields.push(this.state.facets[key].dataField);
	});
	
        return (
		<div>
		<FacetedSearch facets={this.state.facets} onDataChange={this.props.onDataChange}/>
		<IntersectUserData data={this.props.displayedData} onDataChange={this.props.onDataChange} />
		</div>
        );
    }
}

class IntersectUserData extends Component {
    constructor(props) {
        super(props);
	this.state = {
            files: []
        };
	this.handleFilesChange = this.handleFilesChange.bind(this);
	this.intersectData = this.intersectData.bind(this);
    }
    
    componentWillUnmount() {
        // Clean up our area.
        // This is probably where we need to put function call to delete user datafile(s).
	// However, this currently isn't working because unmount events don't appear to be triggered.
        /*this.state.files.forEach(function (file) {
            console.log(file);
            axios.delete(server.apiAddr + '/delete',
                         {params: { serverId: file.serverId }}
                        );
        });*/
    }

    handleFilesChange = (fileItems) => {
        const files = [];
        fileItems.map(fileItem => files.push(fileItem));
        this.setState({ files: files,
			bedtoolsOptions: {} });
	if (!this.state.files.length) {
	    this.props.onDataChange(null);
	}
    }

    // This is where we call pybedtools to do the intersection.
    intersectData = (event) => {
	//console.log(event);

	// Since there should only be one file in the filepond,
	// we will assume files[0] is the desired user file.
	//console.log(this.state.files[0].filename);
	axios.post(server.apiAddr + "/intersectData",
                   { serverId: this.state.files[0].serverId,
		     filename: this.state.files[0].filename,
                     data: JSON.stringify(this.props.data),
                     bedtoolsOptions: this.state.bedtoolsOptions }
                  )
            .then(res => {
		const intersectingData = JSON.parse(res.data[0]);
		this.props.onDataChange(intersectingData);
            })
            .catch(error => {
                console.log(error.response);
		// Handle the error
            });
	event.preventDefault();
    }
    
    render () {
        return (
            <div>
                Upload BED data to Intersect:
                <FileUploader onFilesChange={this.handleFilesChange} files={this.state.files}/>
	        <form onSubmit={this.intersectData}>
		<input type="submit" value="Intersect" disabled={!this.state.files.length}/>
	        </form>
	    </div>
        );
    }
}


export default MapControls;
