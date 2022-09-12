import { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Tree } from 'antd';
import AntdIcon from './AntdIcon.react';
import { omitBy, isUndefined } from 'lodash';
import { flatToTree } from './utils';
import 'antd/dist/antd.css';
import './styles.css'


// 定义树形控件AntdTree，api参数参考https://ant.design/components/tree-cn/
const AntdTree = (props) => {

    // 取得必要属性或参数
    let {
        id,
        className,
        setProps,
        style,
        key,
        checkable,
        selectable,
        selectedKeys,
        expandedKeys,
        checkedKeys,
        defaultExpandAll,
        defaultExpandedKeys,
        defaultExpandParent,
        checkStrictly,
        defaultCheckedKeys,
        defaultSelectedKeys,
        multiple,
        showLine,
        showIcon,
        height,
        persistence,
        persisted_props,
        persistence_type,
        loading_state
    } = props;

    if (showLine) {
        showLine = { 'showLeafIcon': false }
    }

    let { treeData, treeDataMode } = props;

    useEffect(() => {
        setProps({
            expandedKeys: defaultExpandedKeys && !expandedKeys ? defaultExpandedKeys : expandedKeys,
            selectedKeys: defaultSelectedKeys && !selectedKeys ? defaultSelectedKeys : selectedKeys,
            checkedKeys: defaultCheckedKeys && !checkedKeys ? defaultCheckedKeys : checkedKeys
        })
    }, [])

    const flatToTreeData = useMemo(() => {
        return flatToTree(treeData);
    }, [treeData])

    // 根据treeDataMode对treeData进行预处理
    if (treeDataMode === 'flat') {
        treeData = flatToTreeData
    }

    // 用于以递归的方式将节点icon属性替换成相应的icon对象
    const add_leaf_node_icon = (inputTreeData) => {
        if (typeof inputTreeData === typeof {}) {

            if (inputTreeData.hasOwnProperty('children')) {
                if (typeof inputTreeData.icon === typeof "") {
                    inputTreeData.icon = <AntdIcon icon={inputTreeData.icon} />
                }

                for (var i = 0; i < inputTreeData.children.length; i++) {
                    inputTreeData.children[i] = add_leaf_node_icon(inputTreeData.children[i])
                }

            } else {
                if (typeof inputTreeData.icon === typeof "") {
                    inputTreeData.icon = <AntdIcon icon={inputTreeData.icon} />
                }
            }
        }

        if (typeof inputTreeData == typeof []) {
            for (var i = 0; i < inputTreeData.length; i++) {
                inputTreeData[i] = add_leaf_node_icon(inputTreeData[i])
            }
        }

        return inputTreeData;
    }

    treeData = add_leaf_node_icon(treeData)

    const listenSelect = (e) => {
        setProps({ selectedKeys: e })
    }

    const listenCheck = (checkedKeys, e) => {
        if (checkStrictly) {
            setProps({
                checkedKeys: checkedKeys.checked,
                halfCheckedKeys: checkedKeys.halfChecked
            })
        } else {
            setProps({
                checkedKeys: checkedKeys,
                halfCheckedKeys: e.halfCheckedKeys
            })
        }
    }

    const listenExpand = (e) => {
        setProps({ expandedKeys: e })
    }

    let config = {
        expandedKeys
    }

    config = omitBy(config, isUndefined)

    return (
        <Tree
            id={id}
            className={className}
            style={style}
            key={key}
            treeData={add_leaf_node_icon(treeData)}
            selectedKeys={selectedKeys}
            checkedKeys={checkedKeys}
            selectable={selectable}
            checkable={checkable}
            defaultExpandAll={defaultExpandAll}
            defaultExpandedKeys={defaultExpandedKeys}
            defaultExpandParent={defaultExpandParent}
            defaultCheckedKeys={defaultCheckedKeys}
            defaultSelectedKeys={defaultSelectedKeys}
            checkStrictly={checkStrictly}
            multiple={multiple}
            showLine={showLine}
            onSelect={listenSelect}
            onCheck={listenCheck}
            onExpand={listenExpand}
            showIcon={showIcon}
            height={height}
            titleRender={(nodeData) => {
                return (
                    <span className={"ant-tree-title"}
                        style={nodeData.style}>
                        {nodeData.title}
                    </span>
                );
            }}
            showLeafIcon={false}
            persistence={persistence}
            persisted_props={persisted_props}
            persistence_type={persistence_type}
            data-dash-is-loading={
                (loading_state && loading_state.is_loading) || undefined
            }
            {...config}
        />
    );
}

// 定义递归PropTypes
const PropTreeNodeShape = {
    // 标题
    title: PropTypes.string.isRequired,

    // 唯一识别id
    key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,

    // 可选，设置是否禁用
    disabled: PropTypes.bool,

    // 可选，设置节点对应icon
    icon: PropTypes.node,

    // 可选，当树为checkable时，设置对应节点是否展示checkbox
    checkable: PropTypes.bool,

    // 可选，设置是否禁用checkbox
    disableCheckbox: PropTypes.bool,

    // 可选，设置对应节点是否可选
    selectable: PropTypes.bool,

    // 设置当前节点css样式
    style: PropTypes.object
};

const PropTreeNode = PropTypes.shape(PropTreeNodeShape);
PropTreeNodeShape.children = PropTypes.arrayOf(PropTreeNode);
const treeDataPropTypes = PropTypes.arrayOf(PropTreeNode);

// 定义偏平结构节点类型
const PropFlatNodeShape = {
    // 标题
    title: PropTypes.string.isRequired,

    // 唯一识别id
    key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,

    // 可选，设置是否禁用
    disabled: PropTypes.bool,

    // 可选，设置节点对应icon
    icon: PropTypes.node,

    // 可选，当树为checkable时，设置对应节点是否展示checkbox
    checkable: PropTypes.bool,

    // 可选，设置是否禁用checkbox
    disableCheckbox: PropTypes.bool,

    // 可选，设置对应节点是否可选
    selectable: PropTypes.bool,

    // 可选，设置对应节点的父节点key值
    parent: PropTypes.string,

    // 设置当前节点css样式
    style: PropTypes.object
};

// 定义参数或属性
AntdTree.propTypes = {
    // 组件id
    id: PropTypes.string,

    // css类名
    className: PropTypes.string,

    // 自定义css字典
    style: PropTypes.object,

    // 辅助刷新用唯一标识key值
    key: PropTypes.string,

    // 组织树形结构的json结构数据
    treeData: PropTypes.oneOfType([
        // 树结构
        treeDataPropTypes,
        // 偏平结构
        PropTypes.arrayOf(PropFlatNodeShape)
    ]),

    // 设置treeData模式，可选的有'tree'、'flat'，默认为'tree'
    treeDataMode: PropTypes.oneOf(['tree', 'flat']),

    // 设置是否渲染icon，默认为true
    showIcon: PropTypes.bool,

    // 设置是否在节点前添加选择框，默认为false
    checkable: PropTypes.bool,

    // 设置是否默认展开全部节点，默认为false
    defaultExpandAll: PropTypes.bool,

    // 设置初始状态下被展开的节点key数组
    defaultExpandedKeys: PropTypes.arrayOf(PropTypes.string),

    // 设置是否默认展开父节点，默认为false
    defaultExpandParent: PropTypes.bool,

    // 设置先辈节点与后代节点之间是否独立选择，默认false
    checkStrictly: PropTypes.bool,

    // 设置默认被勾选的节点
    defaultCheckedKeys: PropTypes.arrayOf(PropTypes.string),

    // 设置默认被选择的节点
    defaultSelectedKeys: PropTypes.arrayOf(PropTypes.string),

    // 设置是否允许对节点进行多选，默认为false
    multiple: PropTypes.bool,

    // 设置是否允许对节点进行选择，默认为true
    selectable: PropTypes.bool,

    // 设置是否显示连接线，默认为true
    showLine: PropTypes.oneOfType([PropTypes.bool, PropTypes.exact({ showLeafIcon: PropTypes.bool })]),

    // 用于存储当前已被选中的节点key数组
    selectedKeys: PropTypes.array,

    // 用于存储当前已被勾选的节点key数组
    checkedKeys: PropTypes.array,

    // 不可控属性，用于记录当前状态下处于半勾选状态下的节点key数组
    halfCheckedKeys: PropTypes.array,

    // 对应当前已展开节点的key值数组
    expandedKeys: PropTypes.arrayOf(PropTypes.string),

    // 设置虚拟滚动模式下的窗口像素高度，不设置时则不会启动虚拟滚动模式
    height: PropTypes.number,

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
    setProps: PropTypes.func,

    /**
   * Used to allow user interactions in this component to be persisted when
   * the component - or the page - is refreshed. If `persisted` is truthy and
   * hasn't changed from its previous value, a `value` that the user has
   * changed while using the app will keep that change, as long as
   * the new `value` also matches what was given originally.
   * Used in conjunction with `persistence_type`.
   */
    persistence: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.string,
        PropTypes.number
    ]),

    /**
     * Properties whose user interactions will persist after refreshing the
     * component or the page. Since only `value` is allowed this prop can
     * normally be ignored.
     */
    persisted_props: PropTypes.arrayOf(PropTypes.oneOf(['selectedKeys', 'checkedKeys', 'expandedKeys'])),

    /**
     * Where persisted user changes will be stored:
     * memory: only kept in memory, reset on page refresh.
     * local: window.localStorage, data is kept after the browser quit.
     * session: window.sessionStorage, data is cleared once the browser quit.
     */
    persistence_type: PropTypes.oneOf(['local', 'session', 'memory'])
};

// 设置默认参数
AntdTree.defaultProps = {
    showLine: { 'showLeafIcon': false },
    showIcon: true,
    persisted_props: ['selectedKeys', 'checkedKeys', 'expandedKeys'],
    persistence_type: 'local',
    treeDataMode: 'tree'
}

export default AntdTree;