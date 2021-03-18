const path = require("path")
const htmlWebpackPlugin = require("html-webpack-plugin")
const ESLintPlugin = require('eslint-webpack-plugin')

const BUILD_DIR = path.join(__dirname, "dist")
const APP_DIR = path.join(__dirname, "src")

module.exports={
    mode:"development",
    entry: APP_DIR + '/index.js',
    output: {
        path: BUILD_DIR,
        filename:'app.build.js'
    },
    module:{
        rules:[
            {
                enforce:"pre",
                test:/\.js$/,
                exclude: /node_modules/,
                use:[{
                        loader: "prettier-loader",
                        options:{
                            semi: true,
                            printWidth: 80,
                            tabWidth: 2,
                            useTabs: false,
                            singleQuote: true,
                            trailingComma: "all",
                            bracketSpacing: true,
                            jsxBracketSameLine: false,
                        }
                    }
                ],

            },
            {
                test: /\.(js|jsx)$/,
                exclude: /node-modules/,
                use: "babel-loader"
            },
            {
                test:/\.css$/,
                use:["style-loader", "css-loader"]
            },
            {
                test:/\.(jpe?g|svg|gif|png)$/,
                use:"file-loader"
            }
        ],
    },
    devServer:{
        contentBase: BUILD_DIR,
        compress: true,
        port:9000,
        disableHostCheck: false,
        open: true,
        hot: true,
        historyApiFallback: true,
    },
    plugins:[
        new htmlWebpackPlugin({template:"./public/index.html"}),
        new ESLintPlugin({
            // The warnings found will always be emitted, to disable set to false.
            emitWarning: true,
            //Will cause the module build to fail if there are any errors, 
            // to disable set to false
            failOnError: false,
            // Will cause the module build to fail if there are any warnings, 
            // if set to true.
            failOnWarning: false, 
        })
    ]
}