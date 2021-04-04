const path = require("path")
const htmlWebpackPlugin = require("html-webpack-plugin")
const ESLintPlugin = require('eslint-webpack-plugin')
const PrettierPlugin = require('prettier-webpack-plugin')
const {CleanWebpackPlugin} = require("clean-webpack-plugin")

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
            emitWarning: true,
            failOnError: false,
            failOnWarning: false, 
        }),
        new PrettierPlugin({
            semi: true,
            printWidth: 80,
            tabWidth: 2,
            useTabs: false,
            singleQuote: true,
            trailingComma: "all",
            bracketSpacing: true,
            jsxBracketSameLine: false,
            // extensions:['js','jsx']
        })
        }),
        new MiniCssExtractPlugin()
    ]
}