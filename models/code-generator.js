/*
 * Copyright (c) 2018 @cesiztel All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

const fs = require('fs');
const codegen = require('../utils/codegen-utils');
const fileUtils = require('../utils/file-utils');
const codeClassGen = require('../code-class-generator');
const classGenerator = require('../class-generator');
const MODEL_IMPORTS = require('./model-imports');

class ModelCodeGenerator {
    /**
     * @constructor
     *
     * @param {type.UMLPackage} baseModel
     * @param {type.FileManager}
     * @param {type.CodeWriter}
     */
    constructor(baseModel, fileManager, writer) {
        /** @member {type.Model} */
        this.baseModel = baseModel;

        /** @member {type.FileManager} */
        this.fileManager = fileManager;

        /** @member {type.CodeWriter} */
        this.writer = writer;
    }

    /**
     * Generate the file name. In Laravel the file name
     * is based on the following components.
     *
     * - Current date
     * - Table name
     *
     * Those components are used in the following
     * format:
     *
     * yyyy_mm_dd_hhmmss_create_[table_name]_table.php
     *
     * @param elem
     *
     * @returns {*}
     */
    generateFileName(elem) {
        let extension = '.php';
        let tableName = elem.model.name;

        return `${tableName}${extension}`;
    }

    /**
     * Generates the main code of the class
     *
     * @param elem
     */
    generateClassCode(elem) {
        let modelName = elem.model.name;
        var classCodeGenerator = this;

        let className = `${modelName}`;
        const modelTags = this.extractTags(elem.model.tags);
        let generator = new classGenerator.ClassGenerator(className);
        generator.addImport('Illuminate\\Database\\Eloquent\\Model;');
        
        Object.keys(modelTags).forEach(tagName => {
            const importStatment = MODEL_IMPORTS[tagName];
            if(!importStatment){
                return;
            }
            generator.addImport(importStatment);
        });

        if(modelTags['authenticatable']){
            generator.addExtend('Authenticatable');
        }else{
            generator.addExtend('Model');
        }

        const fillable = new classGenerator.ClassVariableGenerator('fillable', 'protected', 
        this.generateModelAttributes(elem), '');
        // fillable.addVariable('name')
        generator.addVariableGenerator(fillable);

        //
        console.log(elem);

        (new codeClassGen.CodeBaseClassGenerator(generator, this.writer)).generate();
    }

    /**
     * 
     * @param {type.ERDEntityTag} tags 
     * @returns {Object} newTags
     */
    extractTags(tags){
        const newTags = tags.reduce((previousValue, tag) => {
            const {name, ...otherParams} = tag;
            return  {...previousValue, [ name ]: otherParams};
        },{});
        return newTags;
    }

    generateModelAttributes(elem) {
        const attributes = elem.model.attributes;
        if (!attributes) {
            return null;
        }
        return attributes.map((singleAttribute) => {
            return singleAttribute.name;
        });
    }

    /**
     * Generate codes from a given element
     *
     * @param {type.Model} elem
     * @param {string} path
     * @param {Object} options
     */
    generate(elem) {
        let result = new $.Deferred();
        let filePath;

        if (elem instanceof type.UMLClassView) {
            this.generateClassCode(elem);

            filePath = `${this.fileManager.getModelsFullPath()}/${this.generateFileName(elem)}`;
            console.log(filePath);
            fs.writeFileSync(filePath, this.writer.getData());
        } else {
            result.resolve();
        }

        return result.promise();
    }


}


/**
 * Generate
 * @param {type.Model} baseModel
 * @param {string} basePath
 * @param {Object} options
 */
function generate(baseModel, basePath, options) {
    var fileManager = new fileUtils.FileManager(basePath, options);
    fileManager.prepareModelsFolder(
        function () {
            baseModel.ownedViews.forEach(child => {
                let writer = new codegen.CodeWriter('\t');
                let codeGenerator = new ModelCodeGenerator(baseModel, fileManager, writer);

                codeGenerator.generate(child);
            });
        },
        function () {
            app.dialogs.showErrorDialog("Canceled operation by user.");

            return;
        }
    );
}

exports.generate = generate;