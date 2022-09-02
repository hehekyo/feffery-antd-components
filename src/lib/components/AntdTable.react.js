import React, { Component, useContext, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Table, Checkbox, Switch, Popover, Popconfirm, ConfigProvider, Typography, Input, Form, Tag, Button, Badge, Space, Image, message } from 'antd';
import { TinyLine, TinyArea, TinyColumn, Progress, RingProgress } from '@ant-design/charts';
import Highlighter from 'react-highlight-words';
import { SearchOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { isNumber, isEqual, cloneDeep } from 'lodash';
import { str2Locale } from './locales.react';
import 'antd/dist/antd.css';
import './styles.css';

const { Text } = Typography;

// 定义表格组件AntdTable，部分api参数参考https://ant.design/components/table-cn/
class AntdTable extends Component {

    constructor(props) {
        super(props)

        // 处理pagination参数的默认值问题
        props.setProps({
            pagination: {
                ...props.pagination,
                ...{
                    current: props.pagination?.current ? props.pagination?.current : 1,
                    showTotalPrefix: props.pagination?.showTotalPrefix ? props.pagination?.showTotalPrefix : '共 ',
                    showTotalSuffix: props.pagination?.showTotalSuffix ? props.pagination?.showTotalSuffix : ' 条记录',
                }
            }
        })

        this.state = {
            searchText: '',
            searchedColumn: ''
        }

        this.onPageChange = (pagination, filter, sorter, currentData) => {

            // 当本次事件由翻页操作引发时
            if (currentData.action === 'paginate') {
                props.setProps({
                    pagination: { ...pagination, ...{ pageSize: pagination?.pageSize, current: pagination.current } },
                    currentData: currentData.currentDataSource
                })
            } else if (currentData.action === 'sort') {
                // 当本次事件由排序操作引发时
                // 当sorter为数组时，即为多字段组合排序方式时
                if (Array.isArray(sorter)) {
                    props.setProps(
                        {
                            sorter: {
                                columns: sorter.map(item => item.column.dataIndex),
                                orders: sorter.map(item => item.order)
                            }
                        }
                    )
                } else if (sorter.order) {
                    // 单字段排序方式
                    props.setProps(
                        {
                            sorter: {
                                columns: [sorter.column.dataIndex],
                                orders: [sorter.order]
                            }
                        }
                    )
                } else {
                    // 非排序状态
                    props.setProps(
                        {
                            sorter: {
                                columns: [],
                                orders: []
                            }
                        }
                    )
                }
            } else if (currentData.action === 'filter') {
                props.setProps({ filter: filter })
            }
        }

        // 自定义关键词搜索过滤模式
        this.getColumnSearchProps = (dataIndex, title) => ({
            filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                <div style={{ padding: 8 }}>
                    <Input
                        ref={node => {
                            this.searchInput = node;
                        }}
                        placeholder={`${props.locale === 'en-us' ? 'Search' : '搜索'} ${title}`}
                        value={selectedKeys[0]}
                        onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onPressEnter={() => this.handleSearch(selectedKeys, confirm, dataIndex)}
                        style={{ marginBottom: 8, display: 'block' }}
                    />
                    <Space>
                        <Button
                            type="primary"
                            onClick={() => this.handleSearch(selectedKeys, confirm, dataIndex)}
                            icon={<SearchOutlined />}
                            size="small"
                            style={{ width: 90 }}
                        >
                            {props.locale === 'en-us' ? 'Search' : '搜索'}
                        </Button>
                        <Button onClick={() => this.handleSearchReset(clearFilters)} size="small" style={{ width: 90 }}>
                            {props.locale === 'en-us' ? 'Reset' : '重置'}
                        </Button>
                    </Space>
                </div>
            ),
            filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
            onFilter: (value, record) => {
                if (props.mode === 'client-side') {
                    if (record[dataIndex]) {
                        return record[dataIndex].toString().toLowerCase().includes(value?.toLowerCase())
                    }
                    return false;
                } else {
                    return true
                }
            },
            onFilterDropdownVisibleChange: visible => {
                if (visible) {
                    setTimeout(() => this.searchInput.select(), 100);
                }
            },
            render: text =>
                this.state.searchedColumn === dataIndex ? (
                    <Highlighter
                        highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
                        searchWords={[this.state.searchText]}
                        autoEscape
                        textToHighlight={text ? text.toString() : ''}
                    />
                ) : (
                    text
                ),
        });

        this.handleSearch = (selectedKeys, confirm, dataIndex) => {
            confirm();
            this.setState({
                searchText: selectedKeys[0],
                searchedColumn: dataIndex,
            });
        };

        this.handleSearchReset = clearFilters => {
            clearFilters();
            this.setState({ searchText: '' });
        };
    }

    shouldComponentUpdate(nextProps) {

        // 计算发生变化的参数名
        const changedProps = Object.keys(nextProps)
            .filter(key => !isEqual(this.props[key], nextProps[key]))

        return true;
    }

    render() {

        // 自定义可编辑单元格
        const EditableContext = React.createContext(null);

        const EditableRow = ({ index, ...props }) => {
            const [form] = Form.useForm();
            return (
                <Form form={form} component={false}>
                    <EditableContext.Provider value={form}>
                        <tr {...props} />
                    </EditableContext.Provider>
                </Form>
            );
        };

        const EditableCell = ({
            title,
            editable,
            children,
            dataIndex,
            record,
            ...restProps
        }) => {
            const [editing, setEditing] = useState(false);
            const inputRef = useRef(null);
            const form = useContext(EditableContext);
            useEffect(() => {
                if (editing) {
                    inputRef.current.focus();
                }
            }, [editing]);

            const toggleEdit = () => {
                setEditing(!editing);
                form.setFieldsValue({
                    [dataIndex]: record[dataIndex],
                });
            };

            const [dataSource, setDataSource] = useState(data)

            // 负责监听单元格内容修改动作从而进行相关值的更新
            const handleSave = (row, setProps, dataSource, setDataSource) => {

                const newData = [...dataSource];
                const index = newData.findIndex((item) => row.key === item.key);
                const item = newData[index];

                const rowColumns = Object.getOwnPropertyNames(row)

                // 循环取出属性名，再判断属性值是否一致
                for (var i = 0; i < rowColumns.length; i++) {
                    // 找到发生值修改的字段
                    if (row[rowColumns[i]] !== item[rowColumns[i]] &&
                        columnsFormatConstraint &&
                        columnsFormatConstraint[rowColumns[i]] &&
                        columnsFormatConstraint[rowColumns[i]].rule) {
                        // 检查是否满足预设的正则表达式规则
                        if (!eval(`/${columnsFormatConstraint[rowColumns[i]].rule}/`).test(row[rowColumns[i]])) {
                            message.error(`编辑失败，${row[rowColumns[i]]} 输入${columnsFormatConstraint[rowColumns[i]]?.content || '不符合对应字段格式要求！'}`);
                            return;
                        }
                    }
                }

                newData.splice(index, 1, { ...item, ...row });

                setDataSource(newData);

                setProps({
                    currentData: newData,
                    recentlyChangedRow: row,
                    data: newData
                })
            };


            const save = async () => {
                try {
                    const values = await form.validateFields();
                    toggleEdit();
                    handleSave({ ...record, ...values }, setProps, dataSource, setDataSource);
                } catch (errInfo) {
                    console.log(errInfo)
                }
            };

            let childNode = children;

            if (editable) {
                childNode = editing ? (
                    <Form.Item
                        style={{
                            margin: 0,
                        }}
                        name={dataIndex}
                        rules={[
                            {
                                required: false,
                                message: `${title} 为空！`,
                            },
                        ]}
                    >
                        <Input ref={inputRef} onPressEnter={save} onBlur={save} />
                    </Form.Item>
                ) : (
                    <div
                        className="editable-cell-value-wrap"
                        onClick={toggleEdit}
                    >
                        {children}
                    </div>
                );
            }

            return <td {...restProps}>{childNode}</td>;
        };

        // 配置自定义组件
        const components = {
            body: {
                row: EditableRow,
                cell: EditableCell,
            },
        };

        // 数值比较函数
        const compareNumeric = (x, y) => {
            if (x.value < y.value) {
                return -1;
            } else if (x.value > y.value) {
                return 1;
            } else {
                return 0;
            }
        }

        // 取得必要属性或参数
        let {
            id,
            className,
            style,
            key,
            locale,
            containerId,
            setProps,
            columns,
            miniChartHeight,
            miniChartAnimation,
            rowSelectionType,
            selectedRowKeys,
            rowSelectionWidth,
            sticky,
            titlePopoverInfo,
            columnsFormatConstraint,
            enableHoverListen,
            data,
            sortOptions,
            filterOptions,
            pagination,
            bordered,
            maxHeight,
            maxWidth,
            size,
            mode,
            nClicksButton,
            summaryRowContents,
            summaryRowFixed,
            customFormatFuncs,
            conditionalStyleFuncs,
            expandedRowKeyToContent,
            expandedRowWidth,
            expandRowByClick,
            loading_state
        } = this.props;

        if (!data) {
            data = []
        }

        // 重新映射size到符合常识的顺序
        let size2size = new Map([
            ['small', 'default'],
            ['default', 'small'],
            ['large', 'middle']
        ])

        // 为pagination补充默认参数值
        pagination = {
            ...pagination,
            ...{
                showTotalPrefix: pagination?.showTotalPrefix ? pagination.showTotalPrefix : '共 ',
                showTotalSuffix: pagination?.showTotalSuffix ? pagination.showTotalSuffix : ' 条记录',
            }
        }

        // 当未设置行key时，自动以自增1的字符型结果作为key
        for (let i in data) {
            if (!data[i].hasOwnProperty('key')) {
                data[i]['key'] = i.toString()
            }
        }

        // 为columns配置默认align、conditionalStyleFuncs参数
        for (let i in columns) {

            columns[i] = {
                align: 'center',
                ...columns[i],
                ...{
                    onCell: conditionalStyleFuncs[columns[i].dataIndex] ?
                        eval(conditionalStyleFuncs[columns[i].dataIndex]) : undefined
                }
            }
        }

        // 处理可编辑特性
        columns = columns.map((col) => {
            if (!col.editable) {
                return col;
            }

            return {
                ...col,
                onCell: (record) => ({
                    record,
                    editable: col.editable,
                    dataIndex: col.dataIndex,
                    title: col.title
                }),
            };
        });

        // 处理可筛选特性
        // 若为前端渲染模式，在filterOptions中每个字段filterCustomItems缺失的情况下
        // 则会自动根据前端一次性灌入的数据推算出所有添加过滤器字段的唯一值集合作为待选菜单
        if (mode !== 'server-side') {

            // 为filterOptions.filterDataIndexes中定义的每个字段添加过滤功能
            for (let i = 0; i < columns.length; i++) {
                // 若当前字段在filterOptions的keys()中
                if (Object.keys(filterOptions).indexOf(columns[i].dataIndex) !== -1) {
                    // 若当前字段对应filterOptions子元素有filterMode属性且filterMode属性为'keyword'
                    if (filterOptions[columns[i].dataIndex].hasOwnProperty('filterMode') && filterOptions[columns[i].dataIndex].filterMode === 'keyword') {
                        columns[i] = {
                            ...columns[i],
                            ...this.getColumnSearchProps(columns[i].dataIndex, columns[i].title)
                        }
                    } else {
                        // 否则则一律视为'checkbox'模式

                        // 若当前字段对应filterOptions子元素下有filterCustomItems属性
                        // 则为其添加自定义选项
                        if (filterOptions[columns[i].dataIndex].hasOwnProperty('filterCustomItems')) {
                            columns[i] = {
                                ...columns[i],
                                filters: filterOptions[columns[i].dataIndex].filterCustomItems
                                    .map(value => ({ text: value ? value.toString() : '', value: value })),
                                onFilter: (value, record) => record[columns[i].dataIndex] === value,
                                filterMultiple: filterOptions[columns[i].dataIndex]?.filterMultiple,
                                filterSearch: filterOptions[columns[i].dataIndex]?.filterSearch
                            }
                        } else {
                            columns[i] = {
                                ...columns[i],
                                filters: Array.from(new Set(data.map(item => item[columns[i].dataIndex]))).map(
                                    value => ({ text: value ? value.toString() : '', value: value })
                                ).sort(compareNumeric),
                                onFilter: (value, record) => record[columns[i].dataIndex] === value,
                                filterMultiple: filterOptions[columns[i].dataIndex]?.filterMultiple,
                                filterSearch: filterOptions[columns[i].dataIndex]?.filterSearch
                            }
                        }
                    }
                }
            }
        } else {
            // 否则在server-side模式下

            // 为filterOptions.filterDataIndexes中定义的每个字段
            // 添加简单值选择过滤功能
            // 为filterOptions.filterDataIndexes中定义的每个字段添加过滤功能
            for (let i = 0; i < columns.length; i++) {
                // 若当前字段在filterOptions的keys()中
                if (Object.keys(filterOptions).indexOf(columns[i].dataIndex) !== -1) {
                    // 若当前字段对应filterOptions子元素有filterMode属性且filterMode属性为'keyword'
                    if (filterOptions[columns[i].dataIndex].hasOwnProperty('filterMode') && filterOptions[columns[i].dataIndex].filterMode === 'keyword') {
                        columns[i] = {
                            ...columns[i],
                            ...this.getColumnSearchProps(columns[i].dataIndex, columns[i].title)
                        }
                    } else {
                        // 否则则一律视为'checkbox'模式

                        // 若当前字段对应filterOptions子元素下有filterCustomItems属性
                        // 则为其添加自定义选项
                        if (filterOptions[columns[i].dataIndex].hasOwnProperty('filterCustomItems')) {
                            columns[i] = {
                                ...columns[i],
                                filters: filterOptions[columns[i].dataIndex].filterCustomItems
                                    .map(value => ({ text: value ? value.toString() : '', value: value })),
                                onFilter: (value, record) => true // 契合后端刷新模式
                            }
                        } else {
                            columns[i] = {
                                ...columns[i],
                                filters: [],
                                onFilter: (value, record) => true
                            }
                        }
                    }
                }
            }
        }

        // 处理sortOptions参数的默认值问题
        sortOptions = {
            ...{
                multiple: false
            },
            ...sortOptions
        }

        // 配置字段排序参数
        for (let i = 0; i < sortOptions.sortDataIndexes.length; i++) {
            for (let j = 0; j < columns.length; j++) {
                // 若sortOptions与data中本轮迭代到的dataIndex一致
                if (sortOptions.sortDataIndexes[i] === columns[j].dataIndex) {

                    if (sortOptions['multiple']) { // 若为组合排序模式
                        columns[j]['sorter'] = {
                            compare: (a, b) => {
                                // 当渲染模式为server-side时，禁用前端排序操作
                                if (mode === 'server-side') {
                                    return 0
                                } else {
                                    // 处理corner-mark模式排序问题
                                    if (columns.filter(item => item.dataIndex === columns[j].dataIndex)[0]?.renderOptions?.renderType === 'corner-mark') {
                                        if (isNumber(a[columns[j].dataIndex].content) ||
                                            isNumber(b[columns[j].dataIndex].content)) {
                                            return a[columns[j].dataIndex].content - b[columns[j].dataIndex].content
                                        } else {
                                            let stringA = a[columns[j].dataIndex].content ? a[columns[j].dataIndex].content.toUpperCase() : ''

                                            let stringB = b[columns[j].dataIndex].content ? b[columns[j].dataIndex].content.toUpperCase() : ''

                                            if (stringA < stringB) {
                                                return -1;
                                            }

                                            if (stringA > stringB) {
                                                return 1;
                                            }

                                            return 0;
                                        }
                                    }

                                    if (isNumber(a[columns[j].dataIndex]) ||
                                        isNumber(b[columns[j].dataIndex])) {
                                        return a[columns[j].dataIndex] - b[columns[j].dataIndex]
                                    } else {

                                        let stringA = a[columns[j].dataIndex] ? a[columns[j].dataIndex].toUpperCase() : ''

                                        let stringB = b[columns[j].dataIndex] ? b[columns[j].dataIndex].toUpperCase() : ''

                                        if (stringA < stringB) {
                                            return -1;
                                        }

                                        if (stringA > stringB) {
                                            return 1;
                                        }

                                        return 0;
                                    }
                                }

                            },
                            multiple: sortOptions['multiple'] === 'auto' ? 1 : sortOptions.sortDataIndexes.length - i,
                        }
                    } else {
                        // 若非组合排序模式
                        columns[j]['sorter'] = (a, b) => {

                            // 当渲染模式为server-side时，禁用前端排序操作
                            if (mode === 'server-side') {
                                return 0
                            } else {
                                // 处理corner-mark模式排序问题
                                if (columns.filter(item => item.dataIndex === columns[j].dataIndex)[0]?.renderOptions?.renderType === 'corner-mark') {
                                    if (isNumber(a[columns[j].dataIndex].content) ||
                                        isNumber(b[columns[j].dataIndex].content)) {
                                        return a[columns[j].dataIndex].content - b[columns[j].dataIndex].content
                                    } else {
                                        let stringA = a[columns[j].dataIndex].content ? a[columns[j].dataIndex].content.toUpperCase() : ''

                                        let stringB = b[columns[j].dataIndex].content ? b[columns[j].dataIndex].content.toUpperCase() : ''

                                        if (stringA < stringB) {
                                            return -1;
                                        }

                                        if (stringA > stringB) {
                                            return 1;
                                        }

                                        return 0;
                                    }
                                }

                                if (isNumber(a[columns[j].dataIndex]) ||
                                    isNumber(b[columns[j].dataIndex])) {
                                    return a[columns[j].dataIndex] - b[columns[j].dataIndex]
                                } else {
                                    let stringA = a[columns[j].dataIndex] ? a[columns[j].dataIndex].toUpperCase() : ''

                                    let stringB = b[columns[j].dataIndex] ? b[columns[j].dataIndex].toUpperCase() : ''

                                    if (stringA < stringB) {
                                        return -1;
                                    }
                                    if (stringA > stringB) {
                                        return 1;
                                    }
                                    return 0;
                                }
                            }
                        }
                    }
                }
            }
        }

        // 配置各种再渲染模式
        for (let i = 0; i < columns.length; i++) {
            // 当前字段具有renderOptions参数时且renderOptions参数是字典时
            if (columns[i]['renderOptions'] && columns[i]['renderOptions']['renderType']) {
                // ellipsis模式
                if (columns[i]['renderOptions']['renderType'] === 'ellipsis') {
                    columns[i]['ellipsis'] = true
                    columns[i]['render'] = content => (
                        <Text ellipsis={{ tooltip: content }}>
                            {content}
                        </Text>
                    )
                }
                // link模式
                else if (columns[i]['renderOptions']['renderType'] === 'link') {
                    // 检查renderLinkText参数是否定义
                    if (columns[i]['renderOptions']['renderLinkText']) {
                        columns[i]['render'] = content => (
                            <a href={content.disabled ? undefined : content.href}
                                target={content.target ? content.target : '_blank'}
                                disabled={content.disabled}>
                                {content.content ? content.content : columns[i]['renderOptions']['renderLinkText']}
                            </a>
                        )

                    } else {
                        columns[i]['render'] = content => (
                            <a href={content.disabled ? undefined : content.href}
                                target={content.target ? content.target : '_blank'}
                                disabled={content.disabled}>
                                {content.content ? content.content : '链接🔗'}
                            </a>
                        )
                    }
                }
                // copyable模式
                else if (columns[i]['renderOptions']['renderType'] === 'copyable') {
                    columns[i]['render'] = content => (
                        <Text copyable={true}>
                            {content}
                        </Text>
                    )
                }
                // ellipsis-copyable模式
                else if (columns[i]['renderOptions']['renderType'] === 'ellipsis-copyable') {
                    columns[i]['ellipsis'] = true
                    columns[i]['render'] = content => (
                        <Text copyable={true} ellipsis={{ tooltip: content }}>
                            {content}
                        </Text>
                    )
                }
                // corner-mark模式
                else if (columns[i]['renderOptions']['renderType'] === 'corner-mark') {
                    columns[i]['render'] = content => (
                        <div className={content.placement ? 'ant-corner-mark-' + content.placement : 'ant-corner-mark-top-right'}
                            style={{
                                '--ant-corner-mark-color': content.hide ? 'transparent' : (content.color ? content.color : 'rgb(24, 144, 255)'),
                                '--ant-corner-mark-transform': `translate(${content.offsetX ? content.offsetX : 0}px, ${content.offsetY ? content.offsetY : 0}px)`
                            }}>
                            {content.content}
                        </div>
                    )
                }
                // status-badge模式
                else if (columns[i]['renderOptions']['renderType'] === 'status-badge') {
                    columns[i]['render'] = content => (
                        <Badge status={content.status} text={content.text} />
                    )
                }
                // image模式
                else if (columns[i]['renderOptions']['renderType'] === 'image') {
                    columns[i]['render'] = content => (
                        <Image src={content.src} height={content.height} preview={content.preview} />
                    )
                }
                // checkbox模式
                else if (columns[i]['renderOptions']['renderType'] === 'checkbox') {
                    columns[i]['render'] = (content, record) => {
                        const currentDataIndex = columns[i]['dataIndex']
                        return (
                            <Checkbox defaultChecked={content.checked}
                                disabled={content.disabled}
                                onChange={(e) => {
                                    // 修改对应行对应字段item.checked值
                                    try {
                                        data.forEach(function (item, i) {
                                            // 命中后，修改值并利用错误抛出来跳出循环
                                            if (item.key === record.key) {
                                                data[i][currentDataIndex] = {
                                                    ...record[currentDataIndex],
                                                    checked: e.target.checked
                                                }
                                                throw new Error("目标已修改");
                                            }
                                        });
                                    } catch (e) {
                                    };

                                    setTimeout(function () {
                                        setProps({
                                            data: data,
                                            recentlyCheckedRow: record,
                                            recentlyCheckedLabel: content.label,
                                            checkedDataIndex: columns[i]['dataIndex'],
                                            recentlyCheckedStatus: e.target.checked
                                        })
                                    }, 200);
                                }}>
                                {content.label}
                            </Checkbox>
                        );
                    }
                }
                // switch模式
                else if (columns[i]['renderOptions']['renderType'] === 'switch') {
                    columns[i]['render'] = (content, record) => {
                        const currentDataIndex = columns[i]['dataIndex']
                        return (
                            <Switch defaultChecked={content.checked}
                                disabled={content.disabled}
                                checkedChildren={content.checkedChildren}
                                unCheckedChildren={content.unCheckedChildren}
                                onChange={(checked) => {
                                    // 修改对应行对应字段item.checked值
                                    try {
                                        data.forEach(function (item, i) {
                                            // 命中后，修改值并利用错误抛出来跳出循环
                                            if (item.key === record.key) {
                                                data[i][currentDataIndex] = {
                                                    ...record[currentDataIndex],
                                                    checked: checked
                                                }
                                                throw new Error("目标已修改");
                                            }
                                        });
                                    } catch (e) {
                                    };

                                    setTimeout(function () {
                                        setProps({
                                            data: data,
                                            recentlySwtichRow: record,
                                            swtichDataIndex: columns[i]['dataIndex'],
                                            recentlySwtichStatus: checked
                                        })
                                    }, 200);
                                }} />
                        );
                    }
                }
                // button模式
                else if (columns[i]['renderOptions']['renderType'] === 'button') {

                    // 当renderOptions参数的renderButtonPopConfirmProps参数存在
                    if (columns[i]['renderOptions']['renderButtonPopConfirmProps']) {
                        columns[i]['render'] = (content, record) => {

                            // 根据content是否为数组，来决定渲染单个按钮还是多个按钮
                            return Array.isArray(content) ? (
                                <Space>
                                    {
                                        content.map(
                                            content_ => (
                                                <Popconfirm
                                                    title={columns[i]['renderOptions']['renderButtonPopConfirmProps'].title}
                                                    okText={columns[i]['renderOptions']['renderButtonPopConfirmProps'].okText}
                                                    cancelText={columns[i]['renderOptions']['renderButtonPopConfirmProps'].cancelText}
                                                    disabled={content_.disabled}
                                                    getPopupContainer={containerId ? () => (document.getElementById(containerId) ? document.getElementById(containerId) : document.body) : undefined}
                                                    onConfirm={() => setProps({
                                                        recentlyButtonClickedRow: record,
                                                        nClicksButton: nClicksButton + 1,
                                                        clickedContent: content_.content
                                                    })}>
                                                    <Button
                                                        size={'small'}
                                                        type={content_.type}
                                                        danger={content_.danger}
                                                        disabled={content_.disabled}
                                                        style={content_.style}>
                                                        {content_.content}
                                                    </Button>
                                                </Popconfirm>
                                            )
                                        )
                                    }
                                </Space>
                            ) : <Popconfirm
                                title={columns[i]['renderOptions']['renderButtonPopConfirmProps'].title}
                                okText={columns[i]['renderOptions']['renderButtonPopConfirmProps'].okText}
                                cancelText={columns[i]['renderOptions']['renderButtonPopConfirmProps'].cancelText}
                                disabled={content.disabled}
                                getPopupContainer={containerId ? () => (document.getElementById(containerId) ? document.getElementById(containerId) : document.body) : undefined}
                                onConfirm={() => setProps({
                                    recentlyButtonClickedRow: record,
                                    nClicksButton: nClicksButton + 1,
                                    clickedContent: content.content
                                })}>
                                <Button
                                    size={'small'}
                                    type={content.type}
                                    danger={content.danger}
                                    disabled={content.disabled}
                                    style={content.style}>
                                    {content.content}
                                </Button>
                            </Popconfirm>
                        }
                    } else {
                        columns[i]['render'] = (content, record) => {

                            // 根据content是否为数组，来决定渲染单个按钮还是多个按钮
                            return Array.isArray(content) ? (
                                <Space>
                                    {
                                        content.map(
                                            content_ => (
                                                <Button
                                                    onClick={() => setProps({
                                                        recentlyButtonClickedRow: record,
                                                        nClicksButton: nClicksButton + 1,
                                                        clickedContent: content_.content
                                                    })}
                                                    size={'small'}
                                                    type={content_.type}
                                                    danger={content_.danger}
                                                    disabled={content_.disabled}
                                                    href={content_.href}
                                                    target={content_.target}
                                                    style={content_.style}>
                                                    {content_.content}
                                                </Button>
                                            )
                                        )
                                    }</Space>
                            ) : <Button
                                onClick={() => setProps({
                                    recentlyButtonClickedRow: record,
                                    nClicksButton: nClicksButton + 1,
                                    clickedContent: content.content
                                })}
                                size={'small'}
                                type={content.type}
                                danger={content.danger}
                                disabled={content.disabled}
                                href={content.href}
                                target={content.target}
                                style={content.style}>
                                {content.content}
                            </Button>
                        }
                    }
                }
                // tag模式
                else if (columns[i]['renderOptions']['renderType'] === 'tags') {
                    columns[i]['render'] = tags => (
                        <>
                            {tags.map(tag => {
                                return (
                                    <Tag color={tag.color}>
                                        {tag.tag}
                                    </Tag>
                                );
                            })}
                        </>
                    )
                }
                // custom-format模式
                else if (columns[i]['renderOptions']['renderType'] === 'custom-format') {
                    // 若customFormatFuncs对应当前字段的属性值存在
                    if (customFormatFuncs[columns[i]['dataIndex']]) {
                        columns[i]['render'] = content => (
                            eval(customFormatFuncs[columns[i]['dataIndex']])(content)
                        )
                    }
                }
                // mini-line模式
                else if (columns[i]['renderOptions']['renderType'] === 'mini-line') {
                    columns[i]['render'] = data => {
                        let config = {
                            autoFit: true,
                            padding: 0,
                            data: data,
                            animation: miniChartAnimation,
                            smooth: true,
                        };
                        // 检查是否设置了tooltipCustomContent参数
                        if (columns[i]['renderOptions']?.tooltipCustomContent) {
                            config = {
                                ...config,
                                tooltip: {
                                    customContent: eval(columns[i]['renderOptions'].tooltipCustomContent)
                                }
                            }
                        }
                        return <div style={{ height: miniChartHeight }}><TinyLine {...config} /></div>;
                    }
                }
                // mini-bar模式
                else if (columns[i]['renderOptions']['renderType'] === 'mini-bar') {
                    columns[i]['render'] = data => {
                        let config = {
                            padding: 0,
                            autoFit: true,
                            data: data,
                            animation: miniChartAnimation,
                        };
                        // 检查是否设置了tooltipCustomContent参数
                        if (columns[i]['renderOptions']?.tooltipCustomContent) {
                            config = {
                                ...config,
                                tooltip: {
                                    customContent: eval(columns[i]['renderOptions'].tooltipCustomContent)
                                }
                            }
                        }
                        return <div style={{ height: miniChartHeight }}><TinyColumn {...config} /></div>;
                    }
                }
                // mini-progress模式
                else if (columns[i]['renderOptions']['renderType'] === 'mini-progress') {
                    columns[i]['render'] = data => {
                        let config = {
                            autoFit: true,
                            padding: 0,
                            percent: data,
                            animation: miniChartAnimation,
                            color: ['#5B8FF9', '#E8EDF3'],
                        };
                        return <div style={{ height: miniChartHeight }}><Progress {...config} /></div>;
                    }
                }
                // mini-ring-progress模式
                else if (columns[i]['renderOptions']['renderType'] === 'mini-ring-progress') {
                    columns[i]['render'] = data => {
                        let config = {
                            autoFit: true,
                            padding: 0,
                            percent: data,
                            animation: miniChartAnimation,
                            color: ['#5B8FF9', '#E8EDF3'],
                        };
                        return <div style={{ height: miniChartHeight }}><RingProgress {...config} /></div>;
                    }
                }
                // mini-area模式
                else if (columns[i]['renderOptions']['renderType'] === 'mini-area') {
                    columns[i]['render'] = data => {
                        let config = {
                            autoFit: true,
                            padding: 0,
                            data: data,
                            animation: miniChartAnimation,
                            smooth: true,
                        };
                        // 检查是否设置了tooltipCustomContent参数
                        if (columns[i]['renderOptions']?.tooltipCustomContent) {
                            config = {
                                ...config,
                                tooltip: {
                                    customContent: eval(columns[i]['renderOptions'].tooltipCustomContent)
                                }
                            }
                        }
                        return <div style={{ height: miniChartHeight }}><TinyArea {...config} /></div>;
                    }
                }
            }
        }

        // 处理columns.title的增广功能设置
        if (titlePopoverInfo) {
            for (let i = 0; i < columns.length; i++) {
                if (Object.keys(titlePopoverInfo).indexOf(columns[i].dataIndex) !== -1) {

                    if (!columns[i].hasOwnProperty('title_')) {
                        columns[i]['title_'] = columns[i]['title']
                    }
                    let rawTitle = columns[i].title_
                    let title = titlePopoverInfo[columns[i].dataIndex].title
                    let content = titlePopoverInfo[columns[i].dataIndex].content
                    columns[i]['title'] = () => {
                        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {rawTitle}
                            <Popover
                                title={title}
                                content={<div style={{
                                    maxWidth: '250px',
                                    wordWrap: 'break-word',
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-all'
                                }}>{content}</div>}
                                overlayStyle={{ maxWidth: '250px' }}
                                placement={'bottom'}
                                getPopupContainer={containerId ? () => (document.getElementById(containerId) ? document.getElementById(containerId) : document.body) : undefined}>
                                <QuestionCircleOutlined
                                    style={{
                                        color: '#8c8c8c',
                                        paddingLeft: '4px',
                                        cursor: 'pointer'
                                    }} />
                            </Popover>
                        </div>
                    }
                }
            }
        }

        // 添加表头单元格监听事件
        if (enableHoverListen) {
            columns = columns.map(
                item => (
                    {
                        ...item,
                        ...{
                            onHeaderCell: (e) => {
                                return {
                                    onMouseEnter: event => { setProps({ recentlyMouseEnterColumn: e.dataIndex }) }, // 鼠标移入字段名
                                };
                            }
                        }
                    }
                )
            )
        }

        let rowSelection
        // 处理行选择功能设置
        if (rowSelectionType) {

            rowSelection = {
                columnWidth: rowSelectionWidth,
                fixed: true,
                type: rowSelectionType,
                selectedRowKeys: selectedRowKeys,
                selections: [
                    Table.SELECTION_ALL,
                    Table.SELECTION_INVERT,
                    Table.SELECTION_NONE
                ],
                onChange: (selectedRowKeys, selectedRows) => {
                    setProps({
                        selectedRowKeys: selectedRowKeys,
                        selectedRows: selectedRows
                    })
                }
            }
        }

        // 处理行可展开内容功能
        let rowExpandedRowRender
        if (expandedRowKeyToContent && Array.isArray(expandedRowKeyToContent)) {
            rowExpandedRowRender = new Map(
                expandedRowKeyToContent.map(
                    item => [item.key, item.content]
                )
            )
        }

        return (
            <ConfigProvider locale={str2Locale.get(locale)}>
                <Table
                    id={id}
                    className={className}
                    style={style}
                    key={key}
                    components={components}
                    rowClassName={() => 'editable-row'}
                    dataSource={data}
                    columns={columns}
                    size={size2size.get(size)}
                    rowSelection={rowSelection}
                    sticky={sticky}
                    pagination={{ ...pagination, ...{ showTotal: total => `${pagination.showTotalPrefix} ${total} ${pagination.showTotalSuffix}` } }}
                    bordered={bordered}
                    scroll={{ x: maxWidth, y: maxHeight, scrollToFirstRowOnChange: true }}
                    onChange={this.onPageChange}
                    onRow={
                        enableHoverListen ?
                            (record, index) => {
                                return {
                                    onMouseEnter: event => { setProps({ recentlyMouseEnterRow: record.key }) }, // 鼠标移入行
                                };
                            } : undefined
                    }
                    summary={summaryRowContents ? () => (
                        <Table.Summary fixed={summaryRowFixed}>
                            <Table.Summary.Row>
                                {summaryRowContents.map((item, i) =>
                                    <Table.Summary.Cell index={i} colSpan={item.colSpan} align={item.align}>
                                        {item.content}
                                    </Table.Summary.Cell>
                                )}
                            </Table.Summary.Row>
                        </Table.Summary>
                    ) : undefined}
                    expandable={
                        rowExpandedRowRender ? {
                            expandedRowRender: (record) => rowExpandedRowRender.get(record.key),
                            rowExpandable: (record) => Boolean(rowExpandedRowRender.get(record.key)),
                            columnWidth: expandedRowWidth,
                            expandRowByClick: expandRowByClick
                        } : undefined
                    }
                    data-dash-is-loading={
                        (loading_state && loading_state.is_loading) || undefined
                    }
                    getPopupContainer={containerId ? () => (document.getElementById(containerId) ? document.getElementById(containerId) : document.body) : undefined}
                />
            </ConfigProvider>
        );
    }
}

// 定义参数或属性
AntdTable.propTypes = {
    // 组件id
    id: PropTypes.string,

    // css类名
    className: PropTypes.string,

    // 自定义css字典
    style: PropTypes.object,

    // 辅助刷新用唯一标识key值
    key: PropTypes.string,

    // 设置语言环境，可选的有'zh-cn'、'en-us'
    locale: PropTypes.oneOf(['zh-cn', 'en-us']),

    // 当表格悬浮层出现滚轮滑动不跟随情况时，用于传入需要绑定的参照容器id信息辅助定位
    containerId: PropTypes.string,

    // 定义字段名称及相关属性
    columns: PropTypes.arrayOf(
        PropTypes.exact({
            // 字段对应表头显示的文字内容
            title: PropTypes.oneOfType([PropTypes.func, PropTypes.string]).isRequired,

            // 字段id信息
            dataIndex: PropTypes.string.isRequired,

            // 预处理方式
            renderOptions: PropTypes.exact({

                // 设置渲染处理类型，可选项有'link'、'ellipsis'、'mini-line'、'mini-bar'、'mini-progress'、'mini-area'、'tags'、'button'
                // 'copyable'、'status-badge'、'image'、'custom-format'、'ellipsis-copyable'、'corner-mark'、'checkbox'
                renderType: PropTypes.oneOf([
                    'link', 'ellipsis', 'mini-line', 'mini-bar', 'mini-progress',
                    'mini-ring-progress', 'mini-area', 'tags', 'button', 'copyable',
                    'status-badge', 'image', 'custom-format', 'ellipsis-copyable',
                    'corner-mark', 'checkbox', 'switch'
                ]),

                // 当renderType='link'时，此参数会将传入的字符串作为渲染link的显示文字内容
                renderLinkText: PropTypes.string,

                // 当renderType='button'时，此参数用于传入与气泡确认卡片相关的参数设置内容
                renderButtonPopConfirmProps: PropTypes.exact({
                    // 设置气泡卡片的标题内容
                    title: PropTypes.string.isRequired,

                    // 设置气泡卡片的okText内容
                    okText: PropTypes.string,

                    // 设置气泡卡片的cancelText内容
                    cancelText: PropTypes.string
                }),

                // 当renderType='mini-line'、'mini-area'或'mini-bar'时
                // 用于设置渲染tooltip所使用到的自定义格式化函数字符串
                tooltipCustomContent: PropTypes.string
            }),

            // 列固定对齐方式，可选项有'left'、'right'
            fixed: PropTypes.oneOf(['left', 'right']),

            // 设置是否可编辑
            editable: PropTypes.bool,

            // 设置列对齐方式，可选项有'left'、'center'、'right'
            align: PropTypes.oneOf(['left', 'center', 'right']),

            // 自定义列像素宽度
            width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),

            // 防止状态更新报错占位用，无实际意义
            ellipsis: PropTypes.any,

            // 防止状态更新报错占位用，无实际意义
            sorter: PropTypes.any,

            // 防止状态更新报错占位用，无实际意义
            render: PropTypes.any,

            // 确保onCell属性类型检查通过
            onCell: PropTypes.any,

            // 备份title信息
            title_: PropTypes.string
        })
    ),

    // 为迷你图模式单元格设置像素高度，默认为30
    miniChartHeight: PropTypes.number,

    // 设置迷你图模式是否启用出现动画，默认为false
    miniChartAnimation: PropTypes.bool,

    // 设置表格单元格尺寸规格，可选的有'small'、'default'和'large'
    size: PropTypes.oneOf(['small', 'default', 'large']),

    // 设置行选择模式，默认不开启，可选的有'checkbox'、'radio'
    rowSelectionType: PropTypes.oneOf(['checkbox', 'radio']),

    // 记录已被选择的行key值数组
    selectedRowKeys: PropTypes.arrayOf(
        PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number
        ])
    ),

    // 设置行选择框宽度，默认为'32px'
    rowSelectionWidth: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number
    ]),

    // 记录已被选择的行记录值列表
    selectedRows: PropTypes.array,

    // 设置粘性表头属性，默认为false
    sticky: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.exact({
            offsetHeader: PropTypes.number
        })
    ]),

    // 设置是否启用行悬浮事件监听（此功能可能会干扰其他正常表格功能，慎用），默认为false
    enableHoverListen: PropTypes.bool,

    // 记录表头各字段事件

    // 记录表头各字段鼠标移入事件
    recentlyMouseEnterColumn: PropTypes.string,

    // 记录表格数据行事件

    // 记录表格数据行鼠标移入事件
    recentlyMouseEnterRow: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number
    ]),

    // 为每个title设置气泡卡片悬浮说明信息，格式如{字段1: {title: '标题内容', 'content': '说明内容巴拉巴拉巴拉'}}
    titlePopoverInfo: PropTypes.object,

    // 为每个字段设置基于【正则表达式】的格式约束，用于在“可编辑单元格”中约束新内容的写入
    columnsFormatConstraint: PropTypes.objectOf(
        PropTypes.exact({
            // 设置对应字段的正则表达式规则
            rule: PropTypes.string,

            // 设置自定义错误提示内容，默认为'不符合纯汉字输入要求！'
            content: PropTypes.string
        })
    ),

    // 定义与columns匹配的行记录数组
    data: PropTypes.arrayOf(
        PropTypes.objectOf(
            PropTypes.oneOfType([
                // 常规模式、ellipsis模式、copyable模式、custom-format模式、ellipsis-copyable模式
                PropTypes.string,

                // 常规模式、ellipsis模式、mini-prorgess模式、mini-ring-progress模式、copyable模式、custom-format模式
                // 其中mini-prorgess模式、mini-ring-progress模式输入值需在0~1之间
                PropTypes.number,

                // link模式
                PropTypes.exact({
                    // 自定义链接显示的文字内容，优先级高于renderLinkText参数
                    content: PropTypes.string,
                    // href链接
                    href: PropTypes.string,
                    // target行为属性，默认为'_blank'
                    target: PropTypes.string,
                    // 设置是否禁用当前链接，默认为false
                    disabled: PropTypes.bool
                }),

                // mini-line模式、mini-bar模式、mini-area模式
                PropTypes.arrayOf(PropTypes.number),

                // tags模式
                PropTypes.arrayOf(
                    PropTypes.exact({
                        // 标签颜色
                        color: PropTypes.string,
                        // 标签内容
                        tag: PropTypes.oneOfType([
                            PropTypes.string,
                            PropTypes.number
                        ])
                    })
                ),

                // button模式
                PropTypes.oneOfType([
                    // 单按钮模式
                    PropTypes.exact({
                        // 设置是否禁用按钮，默认为false
                        disabled: PropTypes.bool,
                        // 设置按钮的type属性，同AntdButton
                        type: PropTypes.oneOf(['primary', 'ghost', 'dashed', 'link', 'text', 'default']),
                        // 设置按钮的danger属性，同AntdButton
                        danger: PropTypes.bool,
                        // 设置按钮的css样式
                        style: PropTypes.object,
                        // 设置按钮的文本内容
                        content: PropTypes.oneOfType([
                            PropTypes.string,
                            PropTypes.number
                        ]),
                        // link类型对应的href
                        href: PropTypes.string,
                        // link类型对应的target
                        target: PropTypes.string
                    }),

                    // 多按钮模式
                    PropTypes.arrayOf(
                        PropTypes.exact({
                            // 设置是否禁用按钮，默认为false
                            disabled: PropTypes.bool,
                            // 设置按钮的type属性，同AntdButton
                            type: PropTypes.oneOf(['primary', 'ghost', 'dashed', 'link', 'text', 'default']),
                            // 设置按钮的danger属性，同AntdButton
                            danger: PropTypes.bool,
                            // 设置按钮的css样式
                            style: PropTypes.object,
                            // 设置按钮的文本内容
                            content: PropTypes.oneOfType([
                                PropTypes.string,
                                PropTypes.number
                            ])
                        })
                    )
                ]),

                // status-badge模式
                PropTypes.exact({
                    // 设置状态徽标的状态
                    status: PropTypes.oneOf(['success', 'processing', 'default', 'error', 'warning']),
                    // 设置状态徽标的后缀文字内容
                    text: PropTypes.oneOfType([
                        PropTypes.string,
                        PropTypes.number
                    ])
                }),

                // image模式
                PropTypes.exact({
                    // 设置图片的src属性
                    src: PropTypes.string,

                    // 设置图片的高度
                    height: PropTypes.oneOfType([
                        PropTypes.string,
                        PropTypes.number
                    ]),

                    // 设置是否允许预览，默认为true
                    preview: PropTypes.bool
                }),

                // corner-mark模式
                PropTypes.exact({
                    // 设置角标的方位，可选的有'top-left'、'top-right'、'bottom-left'、'bottom-right'
                    placement: PropTypes.oneOf(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
                    // 设置角标的颜色，默认为'rgb(24, 144, 255)'
                    color: PropTypes.string,
                    // 设置单元格数值内容
                    content: PropTypes.oneOfType([
                        PropTypes.number,
                        PropTypes.string
                    ]),
                    // 设置角标x方向像素偏移量
                    offsetX: PropTypes.number,
                    // 设置角标y方向像素偏移量
                    offsetY: PropTypes.number,
                    // 设置是否隐藏当前角标，默认为false
                    hide: PropTypes.bool
                }),

                // checkbox模式
                PropTypes.exact({
                    // 设置初始化勾选状态，必填
                    checked: PropTypes.bool,
                    // 设置是否禁用当前checkbox
                    disabled: PropTypes.bool,
                    // 设置勾选框文本标签信息
                    label: PropTypes.string
                }),

                // switch模式
                PropTypes.exact({
                    // 设置初始化开关状态，必填
                    checked: PropTypes.bool,
                    // 设置是否禁用当前开关
                    disabled: PropTypes.bool,
                    // 设置勾选框文本标签信息
                    label: PropTypes.string,
                    // 设置“开”状态下标签信息
                    checkedChildren: PropTypes.string,
                    // 设置“关”状态下标签信息
                    unCheckedChildren: PropTypes.string
                })
            ])
        )
    ),

    // 定义排序参数
    sortOptions: PropTypes.exact({

        // 定义要参与排序的字段对应的dataIndex，多字段组合排序情况下顺序即为优先级，从高往低
        sortDataIndexes: PropTypes.arrayOf(PropTypes.string),

        // 设置是否进行多列组合排序，当设置为'auto'时会开启自动组合排序模式，此时组合排序的字段优先级由用户点击排序的字段顺序所动态决定
        multiple: PropTypes.oneOfType([
            PropTypes.bool,
            PropTypes.oneOf(['auto'])
        ])

    }),

    // 定义筛选参数
    filterOptions: PropTypes.objectOf(
        PropTypes.exact({
            // 设置筛选模式，可选的有'checkbox'、'keyword'，默认为'checkbox'
            filterMode: PropTypes.oneOf(['checkbox', 'keyword']),

            // 'checkbox'模式下可用，用于自定义待筛选项
            filterCustomItems: PropTypes.oneOfType([
                PropTypes.arrayOf([
                    PropTypes.string,
                    PropTypes.number
                ]),
                PropTypes.any
            ]),

            // 'checkbox'模式下可用，用于设置是否允许多选，默认为true
            filterMultiple: PropTypes.bool,

            // 'checkbox'模式下可用，用于设置是否开启搜索框，默认为false
            filterSearch: PropTypes.bool
        })
    ),

    // 翻页相关参数，设置为false时不展示和进行分页
    pagination: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.exact({

            // 设置分页组件的位置，可选项有'topLeft'、'topCenter'、'topRight'、'bottomLeft'、'bottomCenter'以及'bottomRight'
            position: PropTypes.oneOf([
                'topLeft', 'topCenter', 'topRight', 'bottomLeft', 'bottomCenter', 'bottomRight'
            ]),

            // 每页显示的记录行数
            pageSize: PropTypes.number,

            // 当前的页码
            current: PropTypes.number,

            // 设置是否展示pageSize切换器，当total大于50时默认为true
            showSizeChanger: PropTypes.bool,

            // 设定每页尺寸切换可选的范围
            pageSizeOptions: PropTypes.arrayOf(PropTypes.number),

            // 设置是否显示原生页面悬浮提示title信息，默认为true
            showTitle: PropTypes.bool,

            // 设置是否渲染快速跳转控件，默认为false
            showQuickJumper: PropTypes.bool,

            // 定义总记录行数显示部分的前缀文字，默认为"共 "
            showTotalPrefix: PropTypes.string,

            // 定义总记录行数显示部分的后缀文字，默认为" 条记录"
            showTotalSuffix: PropTypes.string,

            // 用于在后端分页时手动设置总数据记录数量
            total: PropTypes.number,

            // 用于设置是否在数据记录只有一页时自动隐藏分页器，默认为false
            hideOnSinglePage: PropTypes.bool,

            // 设置是否开启简洁模式
            simple: PropTypes.bool,

            // 设置是否禁用分页，默认为false
            disabled: PropTypes.bool,

            // 设置是否开启响应式，即分页尺寸会根据屏幕宽度自动进行调整
            responsive: PropTypes.bool,

            // 设置分页器尺寸，可选的有'default'和'small'，默认为'default'
            size: PropTypes.oneOf(['default', 'small'])
        })
    ]),

    // 设置是否为单元格添加边框线，默认为False
    bordered: PropTypes.bool,

    // 设置组件最大高度，每页超出部分将自动转换为竖向滑动浏览方式
    maxHeight: PropTypes.number,

    // 设置组件最大宽度，每页超出部分将自动转换为横向滑动浏览方式
    maxWidth: PropTypes.number,

    // 经过修改操作后，当前状态下最新的dataSource数据
    currentData: PropTypes.array,

    // 经过最近一次修改操作后，被修改的行所对应dataSource中的json字典
    recentlyChangedRow: PropTypes.object,

    // button模式下，最近一次点击事件发生的行对应record信息
    recentlyButtonClickedRow: PropTypes.object,

    // 当前生命周期下，button模式对应字段中按钮被点击过的总次数
    nClicksButton: PropTypes.number,

    // 对应最近一次按钮模式下被点击的按钮文字内容
    clickedContent: PropTypes.string,

    // 经过最近一次排序操作后，对应的字段及排序方式信息
    sorter: PropTypes.exact({
        // 对应参与排序的字段数组
        columns: PropTypes.arrayOf(PropTypes.string),

        // 对应参与排序的各个字段的排序方式（ascend：升序，descend：升序）
        orders: PropTypes.arrayOf(PropTypes.oneOf(['ascend', 'descend']))
    }),

    // 经过最近一次筛选操作后，对应的字段及筛选值信息
    filter: PropTypes.object,

    // 设置数据操纵模式，可选的有'client-side'（前端）、'server-side'（后端），默认为'client-side'
    mode: PropTypes.oneOf(['client-side', 'server-side']),

    // 设置总结栏内容数组，请与每个字段保持一一对应
    summaryRowContents: PropTypes.arrayOf(
        PropTypes.exact({
            // 总结栏单元格内容
            content: PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.number
            ]),

            // 设置当前值横跨的字段数量，默认为1
            colSpan: PropTypes.number,

            // 设置列对齐方式，可选项有'left'、'center'、'right'
            align: PropTypes.oneOf(['left', 'center', 'right'])
        })
    ),

    // 设置总结栏是否启用fixed功能，默认为false
    summaryRowFixed: PropTypes.bool,

    // 针对custom-format自定义格式化对应的字段，设置针对对应列每个值从原始数值到格式化结果的js函数字符串
    // 键名为对应字段的dataIndex
    customFormatFuncs: PropTypes.objectOf(
        PropTypes.string
    ),

    // 以对应字段的dataIndex为键，传入js函数字符串，用于自定义逻辑改变每个单元格的style样式
    conditionalStyleFuncs: PropTypes.objectOf(
        PropTypes.string
    ),

    // 配置行可展开内容，键名为对应行的key，键值为对应行的展开内容
    expandedRowKeyToContent: PropTypes.arrayOf(
        PropTypes.exact({
            'key': PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.number
            ]).isRequired,
            'content': PropTypes.node
        })
    ),

    // 设置行展开控件所占的宽度
    expandedRowWidth: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number
    ]),

    // 设置是否允许直接点击行进行展开，默认为false
    expandRowByClick: PropTypes.bool,

    // 处理checkbox再渲染模式
    // 用于监听最近发生勾选事件的记录行
    recentlyCheckedRow: PropTypes.object,

    // 用于监听最近发生勾选事件的勾选框标签内容
    recentlyCheckedLabel: PropTypes.string,

    // 用于监听最近发生勾选事件的字段dataIndex信息
    checkedDataIndex: PropTypes.string,

    // 用于监听最近发生的勾选行为对应的勾选状态
    recentlyCheckedStatus: PropTypes.bool,

    // 处理switch再渲染模式
    // 用于监听最近发生开关切换事件的记录行
    recentlySwtichRow: PropTypes.object,

    // 用于监听最近发生开关切换事件的字段dataIndex信息
    swtichDataIndex: PropTypes.string,

    // 用于监听最近发生的开关切换行为对应的切换后状态
    recentlySwtichStatus: PropTypes.bool,

    loading_state: PropTypes.shape({
        /**
         * Determines if the component is loading or not
         */
        is_loading: PropTypes.bool,
        /**
         * Holds which property is loading
         */
        prop_name: PropTypes.string,
        /**
         * Holds the name of the component that is loading
         */
        component_name: PropTypes.string
    }),

    /**
     * Dash-assigned callback that should be called to report property changes
     * to Dash, to make them available for callbacks.
     */
    setProps: PropTypes.func
};

// 设置默认参数
AntdTable.defaultProps = {
    summaryRowFixed: false,
    miniChartHeight: 30,
    miniChartAnimation: false,
    enableHoverListen: false,
    bordered: false,
    data: [],
    columns: [],
    sortOptions: {
        sortDataIndexes: []
    },
    filterOptions: {},
    mode: 'client-side',
    nClicksButton: 0,
    size: 'default',
    locale: 'zh-cn',
    conditionalStyleFuncs: {}
}

export default React.memo(AntdTable);