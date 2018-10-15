module.exports = {
    base: '/myvue/',
    themeConfig: {
        docsDir: 'docs',
        locales: {
            '/': {
                label: '简体中文',
                selectText: '选择语言',
                editLinkText: '编辑此页',
                lastUpdated: '上次更新',
                nav: [{
                        text: '指南',
                        link: '/guide/',
                    },
                    {
                        text: '配置参考',
                        link: '/config/'
                    },
                    {
                        text: '默认主题配置',
                        link: '/default-theme-config/'
                    }
                ],
                sidebar: [
                    '/默认slot',
                    '/组件patch阶段'
                ]
            }
        },
        sidebarDepth: 10

    }
}